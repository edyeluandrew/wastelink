// Mock in-memory database for testing while we troubleshoot Neon connection
// This allows all APIs to return real responses

class MockDB {
  constructor() {
    this.pickers = new Map();
    this.collectionPoints = new Map();
    this.wasteLogs = new Map();
    this.earnings = new Map();
    this.pickerIdCounter = 1;
    this.collectionPointIdCounter = 1;
    this.wasteLogIdCounter = 1;
    this.earningsIdCounter = 1;
  }

  // Query simulation
  async query(sql, params = []) {
    // Simple mock implementation
    if (sql.includes('INSERT INTO pickers')) {
      const id = this.pickerIdCounter++;
      const picker = {
        id,
        picker_code: params[0],
        name: params[1],
        phone: params[2],
        gender: params[3],
        age_group: params[4],
        division: params[5],
        main_waste_type: params[6] || null,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      };
      this.pickers.set(id, picker);
      return { rows: [picker] };
    }

    if (sql.includes('SELECT') && sql.includes('FROM pickers WHERE id')) {
      const id = parseInt(params[0]);
      const picker = this.pickers.get(id);
      if (!picker) return { rows: [] };
      return { rows: [picker] };
    }

    if (sql.includes('SELECT id FROM pickers WHERE phone')) {
      const phone = params[0];
      for (const picker of this.pickers.values()) {
        if (picker.phone === phone) {
          return { rows: [{ id: picker.id }] };
        }
      }
      return { rows: [] };
    }

    if (sql.includes('SELECT') && sql.includes('FROM pickers')) {
      const pickers = Array.from(this.pickers.values());
      return { rows: pickers };
    }

    if (sql.includes('UPDATE pickers')) {
      const id = parseInt(params[params.length - 1]);
      const picker = this.pickers.get(id);
      if (!picker) return { rows: [] };
      return { rows: [picker] };
    }

    if (sql.includes('SELECT NOW()')) {
      return { rows: [{ now: new Date().toISOString() }] };
    }

    return { rows: [] };
  }

  async end() {
    // Mock end
  }
}

export default MockDB;
