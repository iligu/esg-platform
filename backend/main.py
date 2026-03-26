"""
Salas O'Brien ESG Platform — Backend API
Handles CSV validation, Scope 1/2/3 GHG calculations, and data quality scoring.
Deploy to Railway, Render, or Fly.io.
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

app = FastAPI(title="SO ESG Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
#  EMISSION FACTOR DATABASES
# ============================================================

FACTOR_VERSION = "eGRID2022 / EPA EF Hub 2024 / USEEIO v2.0 / IPCC AR5"

# EPA eGRID: kg CO2e per kWh by state
EGRID = {
    "CA": 0.2193, "WA": 0.0872, "OR": 0.1134, "AZ": 0.4012, "CO": 0.5834,
    "NV": 0.3201, "TX": 0.3875, "FL": 0.4023, "GA": 0.4198, "LA": 0.4102,
    "NC": 0.3312, "TN": 0.3854, "IL": 0.3588, "OH": 0.5612, "MI": 0.4832,
    "MN": 0.3901, "IN": 0.6912, "WI": 0.4523, "NY": 0.2297, "MA": 0.2834,
    "PA": 0.3012, "CT": 0.2134, "NJ": 0.2534, "MD": 0.3102, "VA": 0.3012,
    "MH": 0.708, "KA": 0.708, "DL": 0.708,
}

# EPA: tCO2e per therm natural gas
NATURAL_GAS_FACTOR = 0.00531

# EPA: tCO2 per gallon gasoline
GASOLINE_FACTOR = 0.008887

# IPCC AR5: GWP per refrigerant
GWP = {
    "R-410A": 2088, "R-134a": 1430, "R-22": 1810,
    "R-404A": 3922, "R-407C": 1774,
}

LBS_TO_MT = 2204.6

# --- SCOPE 3 FACTORS ---

# EPA USEEIO v2.0: kg CO2e per dollar spent (by category)
# Simplified for consulting firm procurement categories
EEIO_PURCHASED_GOODS = 0.00034   # tCO2e per dollar (professional services mix)
EEIO_CAPITAL_GOODS = 0.00042     # tCO2e per dollar (equipment, furniture, IT)

# Business travel: tCO2e per dollar (blended air/hotel/ground)
TRAVEL_FACTOR = 0.00025          # tCO2e per dollar of travel spend

# Employee commuting: tCO2e per mile (average US passenger vehicle)
COMMUTE_FACTOR = 0.000404        # tCO2e per mile (EPA avg passenger car)

# Waste: tCO2e per short ton (mixed MSW, landfill)
WASTE_FACTOR = 0.459             # tCO2e per short ton (EPA WARM model)


# ============================================================
#  VALIDATION
# ============================================================

REQUIRED_COLUMNS = [
    "location_id", "location_name", "region", "state",
    "reporting_year", "gross_area_sqft",
    "electricity_kwh", "electricity_source",
]

VALID_REGIONS = {"West", "South", "Midwest", "Northeast", "India"}
VALID_SOURCES = {"measured", "estimated", "missing"}


def validate_row(row, idx):
    issues = []
    loc = row.get("location_id", f"Row {idx}")

    for col in REQUIRED_COLUMNS:
        val = row.get(col)
        if pd.isna(val) or str(val).strip() == "":
            issues.append({
                "location": loc, "field": col,
                "rule": "Required field missing",
                "severity": "error", "detail": f"{col} is required"
            })

    region = row.get("region", "")
    if region and region not in VALID_REGIONS:
        issues.append({
            "location": loc, "field": "region",
            "rule": "Invalid region",
            "severity": "error", "detail": f"'{region}' not in {VALID_REGIONS}"
        })

    state = row.get("state", "")
    if state and state not in EGRID:
        issues.append({
            "location": loc, "field": "state",
            "rule": "No eGRID factor",
            "severity": "error", "detail": f"No emission factor for state '{state}'"
        })

    sqft = safe_float(row.get("gross_area_sqft", 0))
    kwh = safe_float(row.get("electricity_kwh", 0))
    if sqft > 0 and kwh > sqft * 25:
        issues.append({
            "location": loc, "field": "electricity_kwh",
            "rule": "Electricity exceeds expected range",
            "severity": "warning",
            "detail": f"{kwh:,.0f} kWh exceeds {sqft*25:,.0f} max for {sqft:,.0f} sqft"
        })

    vc = safe_float(row.get("vehicle_count", 0))
    miles = safe_float(row.get("vehicle_miles", 0))
    mpg = safe_float(row.get("vehicle_avg_mpg", 0))
    if vc > 0 and (miles <= 0 or mpg <= 0):
        issues.append({
            "location": loc, "field": "vehicle_miles/mpg",
            "rule": "Vehicle data incomplete",
            "severity": "warning",
            "detail": f"{int(vc)} vehicles listed but miles or MPG missing"
        })

    if mpg > 0 and (mpg < 8 or mpg > 50):
        issues.append({
            "location": loc, "field": "vehicle_avg_mpg",
            "rule": "MPG out of range",
            "severity": "warning",
            "detail": f"MPG {mpg} outside expected 8-50 range"
        })

    for src_col in ["electricity_source", "gas_source", "spend_source"]:
        src = str(row.get(src_col, "")).strip().lower()
        if src and src not in VALID_SOURCES and src != "nan":
            issues.append({
                "location": loc, "field": src_col,
                "rule": "Invalid source tag",
                "severity": "warning",
                "detail": f"'{src}' should be measured, estimated, or missing"
            })

    return issues


# ============================================================
#  CALCULATION ENGINE
# ============================================================

def safe_float(val, default=0.0):
    try:
        if pd.isna(val) or str(val).strip() == "":
            return default
        return float(val)
    except (ValueError, TypeError):
        return default


def calculate_emissions(row):
    state = row.get("state", "")
    kwh = safe_float(row.get("electricity_kwh", 0))
    therms = safe_float(row.get("natural_gas_therms", 0))
    vc = safe_float(row.get("vehicle_count", 0))
    miles = safe_float(row.get("vehicle_miles", 0))
    mpg = safe_float(row.get("vehicle_avg_mpg", 0))
    ref_lbs = safe_float(row.get("refrigerant_lbs", 0))
    ref_type = str(row.get("refrigerant_type", "")).strip()

    # -- Scope 1 --
    s1_gas = therms * NATURAL_GAS_FACTOR
    s1_vehicles = 0.0
    if vc > 0 and miles > 0 and mpg > 0:
        s1_vehicles = (miles / mpg) * GASOLINE_FACTOR
    s1_refrig = 0.0
    if ref_lbs > 0 and ref_type in GWP:
        s1_refrig = (ref_lbs * GWP[ref_type]) / LBS_TO_MT
    s1_total = s1_gas + s1_vehicles + s1_refrig

    # -- Scope 2 --
    egrid_factor = EGRID.get(state, 0)
    s2_elec = (kwh * egrid_factor) / 1000

    # -- Scope 3 --
    purchased = safe_float(row.get("purchased_goods_spend", 0))
    capital = safe_float(row.get("capital_goods_spend", 0))
    travel_spend = safe_float(row.get("business_travel_spend", 0))
    commute_miles = safe_float(row.get("employee_commuting_miles", 0))
    waste_tons = safe_float(row.get("waste_tons", 0))

    s3_purchased = purchased * EEIO_PURCHASED_GOODS
    s3_capital = capital * EEIO_CAPITAL_GOODS
    s3_travel = travel_spend * TRAVEL_FACTOR
    s3_commute = commute_miles * COMMUTE_FACTOR
    s3_waste = waste_tons * WASTE_FACTOR
    s3_total = s3_purchased + s3_capital + s3_travel + s3_commute + s3_waste

    # -- Data quality --
    elec_src = str(row.get("electricity_source", "missing")).strip().lower()
    gas_src = str(row.get("gas_source", "missing")).strip().lower()
    spend_src = str(row.get("spend_source", "missing")).strip().lower()
    sources = [elec_src, gas_src, spend_src]
    if all(s == "measured" for s in sources):
        quality = "measured"
    elif "missing" in sources:
        quality = "partial"
    else:
        quality = "estimated"

    return {
        "location_id": row.get("location_id", ""),
        "location_name": row.get("location_name", ""),
        "region": row.get("region", ""),
        "state": state,
        "sqft": safe_float(row.get("gross_area_sqft", 0)),

        # Scope 1
        "s1_natural_gas": round(s1_gas, 4),
        "s1_vehicles": round(s1_vehicles, 4),
        "s1_refrigerants": round(s1_refrig, 4),
        "s1_total": round(s1_total, 4),

        # Scope 2
        "egrid_factor": egrid_factor,
        "electricity_kwh": kwh,
        "s2_electricity": round(s2_elec, 4),

        # Scope 3
        "s3_purchased_goods": round(s3_purchased, 4),
        "s3_capital_goods": round(s3_capital, 4),
        "s3_business_travel": round(s3_travel, 4),
        "s3_commuting": round(s3_commute, 4),
        "s3_waste": round(s3_waste, 4),
        "s3_total": round(s3_total, 4),

        # Totals
        "total_s1_s2": round(s1_total + s2_elec, 4),
        "total_all": round(s1_total + s2_elec + s3_total, 4),

        "data_quality": quality,
        "factor_version": FACTOR_VERSION,
    }


# ============================================================
#  API ENDPOINTS
# ============================================================

@app.get("/health")
def health():
    return {"status": "ok", "factor_version": FACTOR_VERSION}


@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        # Handle BOM and encoding variations
        text = contents.decode("utf-8-sig").strip()
        # Auto-detect delimiter (comma vs tab vs semicolon)
        first_line = text.split("\n")[0]
        if "\t" in first_line and "," not in first_line:
            sep = "\t"
        elif ";" in first_line and "," not in first_line:
            sep = ";"
        else:
            sep = ","
        df = pd.read_csv(io.StringIO(text), sep=sep)
    except Exception as e:
        return {"error": f"Failed to parse CSV: {str(e)}"}

    df.columns = df.columns.str.strip()

    # Validate
    all_issues = []
    for idx, row in df.iterrows():
        all_issues.extend(validate_row(row, idx + 2))

    errors = [i for i in all_issues if i["severity"] == "error"]
    warnings = [i for i in all_issues if i["severity"] == "warning"]

    # Calculate
    results = [calculate_emissions(row) for _, row in df.iterrows()]

    total_s1 = sum(r["s1_total"] for r in results)
    total_s2 = sum(r["s2_electricity"] for r in results)
    total_s3 = sum(r["s3_total"] for r in results)
    total_all = total_s1 + total_s2 + total_s3

    # Scope 1 breakdown
    s1_breakdown = {
        "natural_gas": round(sum(r["s1_natural_gas"] for r in results), 2),
        "vehicles": round(sum(r["s1_vehicles"] for r in results), 2),
        "refrigerants": round(sum(r["s1_refrigerants"] for r in results), 2),
    }

    # Scope 3 breakdown
    s3_breakdown = {
        "purchased_goods": round(sum(r["s3_purchased_goods"] for r in results), 2),
        "capital_goods": round(sum(r["s3_capital_goods"] for r in results), 2),
        "business_travel": round(sum(r["s3_business_travel"] for r in results), 2),
        "commuting": round(sum(r["s3_commuting"] for r in results), 2),
        "waste": round(sum(r["s3_waste"] for r in results), 2),
    }

    # Regional
    regions = {}
    for r in results:
        reg = r["region"]
        if reg not in regions:
            regions[reg] = {"s1": 0, "s2": 0, "s3": 0, "locations": 0}
        regions[reg]["s1"] += r["s1_total"]
        regions[reg]["s2"] += r["s2_electricity"]
        regions[reg]["s3"] += r["s3_total"]
        regions[reg]["locations"] += 1

    regional_summary = [
        {"region": k, "s1": round(v["s1"], 2), "s2": round(v["s2"], 2),
         "s3": round(v["s3"], 2), "total": round(v["s1"] + v["s2"] + v["s3"], 2),
         "locations": v["locations"]}
        for k, v in regions.items()
    ]

    # Data quality
    quality_counts = {"measured": 0, "estimated": 0, "partial": 0}
    for r in results:
        quality_counts[r["data_quality"]] = quality_counts.get(r["data_quality"], 0) + 1

    quality_score = round(
        (quality_counts["measured"] * 100
         + quality_counts["estimated"] * 60
         + quality_counts["partial"] * 30)
        / max(len(results), 1)
    )

    return {
        "status": "success",
        "locations_processed": len(results),
        "validation": {
            "errors": len(errors),
            "warnings": len(warnings),
            "issues": all_issues,
        },
        "summary": {
            "total_scope1": round(total_s1, 2),
            "total_scope2": round(total_s2, 2),
            "total_scope3": round(total_s3, 2),
            "total_emissions": round(total_all, 2),
            "s1_breakdown": s1_breakdown,
            "s3_breakdown": s3_breakdown,
            "unit": "tCO2e",
            "factor_version": FACTOR_VERSION,
        },
        "data_quality": {
            "score": quality_score,
            "counts": quality_counts,
        },
        "regional": regional_summary,
        "locations": results,
    }