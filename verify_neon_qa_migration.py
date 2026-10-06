import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from sqlalchemy import create_engine, inspect, text

def main():
    print("--- NEON QA MIGRATION VERIFICATION ---")
    engine = create_engine(settings.active_database_url)
    inspector = inspect(engine)
    
    tables = sorted(inspector.get_table_names())
    app_tables = [t for t in tables if t != 'alembic_version']
    
    print(f"Total tables found in schema: {len(tables)}")
    print(f"Application tables count: {len(app_tables)}")
    print("\nTable list:")
    for idx, name in enumerate(tables, 1):
        print(f"  {idx:02d}. {name}")
        
    print("\n--- Alembic Revision & Connectivity ---")
    with engine.connect() as conn:
        rev = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        sel1 = conn.execute(text("SELECT 1")).scalar()
        print(f"Alembic Version Recorded: {rev}")
        print(f"SELECT 1 Query Test: {'PASSED' if sel1 == 1 else 'FAILED'}")
        
    print("\n--- Foreign Key Inspection ---")
    fk_count = 0
    for tbl in app_tables:
        fks = inspector.get_foreign_keys(tbl)
        fk_count += len(fks)
        if fks:
            fk_summary = ", ".join([f"{fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}" for fk in fks])
            print(f"  {tbl}: {len(fks)} FK(s) ({fk_summary})")
        else:
            print(f"  {tbl}: 0 FKs")
            
    print(f"\nTotal Foreign Keys across application tables: {fk_count}")

if __name__ == "__main__":
    main()
