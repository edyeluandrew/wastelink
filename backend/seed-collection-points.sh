#!/bin/bash
# Optional: Seed collection points data for testing
# Run after database is initialized: npm run init-db

echo "Seeding collection points data..."

wsl -u root -d Ubuntu-22.04 bash -c "
psql \"\$DATABASE_URL\" -c \"
INSERT INTO collection_points (point_code, name, division, agent_name, agent_phone, status)
VALUES 
  ('CP001', 'Kawempe Main Collection Center', 'Kawempe', 'John Mutua', '+256700123456', 'ACTIVE'),
  ('CP002', 'Kalerwe Collection Point', 'Kawempe', 'Mary Owino', '+256701234567', 'ACTIVE'),
  ('CP003', 'Makindye Central Collection Hub', 'Makindye', 'Samuel Kipchoge', '+256702345678', 'ACTIVE'),
  ('CP004', 'Makindye South Point', 'Makindye', 'Grace Mbatha', '+256703456789', 'ACTIVE'),
  ('CP005', 'Nakawa Main Point', 'Nakawa', 'Peter Auma', '+256704567890', 'ACTIVE'),
  ('CP006', 'Nakawa East Collection', 'Nakawa', 'Susan Kamau', '+256705678901', 'ACTIVE'),
  ('CP007', 'Rubaga Main Hub', 'Rubaga', 'Thomas Ouma', '+256706789012', 'ACTIVE'),
  ('CP008', 'Rubaga Collection Point', 'Rubaga', 'Elizabeth Kipketer', '+256707890123', 'ACTIVE'),
  ('CP009', 'Central Kampala Collection', 'Central', 'David Mwangi', '+256708901234', 'ACTIVE'),
  ('CP010', 'Central Business District Point', 'Central', 'Monica Kemboi', '+256709012345', 'ACTIVE')
ON CONFLICT (point_code) DO NOTHING;
\"
"

echo "Collection points seeded successfully!"
