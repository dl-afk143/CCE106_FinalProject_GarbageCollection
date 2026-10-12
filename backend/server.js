require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Garbage Collection API is running!",
  });
});

// ==========================================
// TEST MYSQL CONNECTION
// ==========================================

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");

    res.json({
      success: true,
      message: "MySQL connected successfully!",
      result: rows,
    });
  } catch (error) {
    console.error("MySQL Error:", error);

    res.status(500).json({
      success: false,
      message: "MySQL connection failed",
      error: error.message,
    });
  }
});

// ==========================================
// GOOGLE PLACES - AUTOCOMPLETE
// ==========================================

app.post("/places/autocomplete", async (req, res) => {
  try {
    const { input } = req.body;

    if (!input || typeof input !== "string" || !input.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search input is required.",
      });
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Google Places API key is not configured.",
      });
    }

    const googleResponse = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId," +
            "suggestions.placePrediction.text," +
            "suggestions.placePrediction.structuredFormat",
        },
        body: JSON.stringify({
          input: input.trim(),
          languageCode: "en",
          includedRegionCodes: ["ph"],
        }),
      }
    );

    const text = await googleResponse.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        success: false,
        message: "Invalid response from Google Places.",
      });
    }

    if (!googleResponse.ok) {
      console.error("Google Places Autocomplete Error:", data);

      return res.status(googleResponse.status).json({
        success: false,
        message:
          data?.error?.message || "Google Places autocomplete failed.",
      });
    }

    res.json({
      success: true,
      suggestions: data.suggestions || [],
    });
  } catch (error) {
    console.error("Places autocomplete error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to search Google Places.",
      error: error.message,
    });
  }
});

// ==========================================
// GOOGLE PLACES - PLACE DETAILS
// ==========================================

app.get("/places/details/:placeId", async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: "Place ID is required.",
      });
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Google Places API key is not configured.",
      });
    }

    const googleResponse = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
        },
      }
    );

    const text = await googleResponse.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        success: false,
        message: "Invalid response from Google Places.",
      });
    }

    if (!googleResponse.ok) {
      console.error("Google Place Details Error:", data);

      return res.status(googleResponse.status).json({
        success: false,
        message: data?.error?.message || "Google Place Details failed.",
      });
    }

    res.json({
      success: true,
      place: data,
    });
  } catch (error) {
    console.error("Place details error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get place details.",
      error: error.message,
    });
  }
});

// ==========================================
// SUBMIT RESIDENT REPORT
// ==========================================

app.post("/reports", async (req, res) => {
  try {
    const {
      userId,
      issue,
      description,
      photo,
      placeName,
      placeAddress,
      latitude,
      longitude,
      area,
      collectionDate,
      collectionTime,
      wasteType,
      status,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!issue || !description) {
      return res.status(400).json({
        success: false,
        message: "Issue and description are required.",
      });
    }

    if (!placeName || !placeAddress) {
      return res.status(400).json({
        success: false,
        message: "Please select a location from Google Places.",
      });
    }

    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "The specified resident does not exist.",
      });
    }

    const sql = `
      INSERT INTO reports (
        user_id,
        issue,
        description,
        photo,
        place_name,
        place_address,
        latitude,
        longitude,
        area,
        collection_date,
        collection_time,
        waste_type,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      userId,
      issue,
      description,
      photo || null,
      placeName,
      placeAddress,
      latitude ?? null,
      longitude ?? null,
      area || null,
      collectionDate || null,
      collectionTime || null,
      wasteType || null,
      status || "Reported",
    ];

    const [result] = await db.query(sql, values);

    console.log("Report saved successfully. ID:", result.insertId);

    res.status(201).json({
      success: true,
      message: "Report submitted successfully!",
      reportId: result.insertId,
    });
  } catch (error) {
    console.error("Report submission error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit report.",
      error: error.message,
    });
  }
});

// ==========================================
// GET MY REPORTS
// ==========================================

app.get("/reports/my-reports/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!Number.isInteger(Number(userId)) || Number(userId) < 1) {
      return res.status(400).json({
        success: false,
        message: "A valid user ID is required.",
      });
    }

    const [reports] = await db.query(
      `
        SELECT
          id,
          user_id,
          issue,
          description,
          photo,
          place_name,
          place_address,
          latitude,
          longitude,
          area,
          collection_date,
          collection_time,
          waste_type,
          status,
          created_at
        FROM reports
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
      [Number(userId)]
    );

    res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Get my reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get reports.",
      error: error.message,
    });
  }
});

// ==========================================
// GET ALL REPORTS - ADMIN
// ==========================================

app.get("/reports", async (req, res) => {
  try {
    const [reports] = await db.query(`
      SELECT
        r.id,
        r.user_id,
        u.full_name AS resident_name,
        u.email AS resident_email,
        r.issue,
        r.description,
        r.photo,
        r.place_name,
        r.place_address,
        r.latitude,
        r.longitude,
        r.area,
        r.collection_date,
        r.collection_time,
        r.waste_type,
        r.status,
        r.created_at
      FROM reports r
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
    `);

    res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("GET /reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve reports.",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE REPORT STATUS - ADMIN
// ==========================================

app.put("/reports/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID.",
      });
    }

    const allowedStatuses = ["Reported", "In Progress", "Completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
      });
    }

    const [result] = await db.query(
      "UPDATE reports SET status = ? WHERE id = ?",
      [status, Number(id)]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM reports WHERE id = ? LIMIT 1",
        [Number(id)]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Report not found.",
        });
      }
    }

    res.json({
      success: true,
      message: "Report status updated successfully.",
      reportId: Number(id),
      status,
    });
  } catch (error) {
    console.error("Update report status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update report status.",
      error: error.message,
    });
  }
});

// ==========================================
// REGISTER RESIDENT
// ==========================================

app.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required.",
      });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Enter valid details. Password must be at least 6 characters.",
      });
    }

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `
        INSERT INTO users (
          full_name,
          email,
          password,
          role,
          status
        )
        VALUES (?, ?, ?, 'Resident', 'Active')
      `,
      [cleanName, cleanEmail, hashedPassword]
    );

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed.",
      error: error.message,
    });
  }
});

// ==========================================
// LOGIN
// ==========================================

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const [users] = await db.query(
      `
        SELECT id, full_name, email, password, role, status
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = users[0];

    if (user.status === "Disabled") {
      return res.status(403).json({
        success: false,
        message: "This account has been disabled. Contact the administrator.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    res.json({
      success: true,
      message: "Login successful!",
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed.",
      error: error.message,
    });
  }
});

// ==========================================
// SCHEDULE ASSIGNMENT HELPERS (4.5 PERSONNEL ASSIGNMENT)
// ==========================================

// Returns an error message if the personnel can't be assigned, otherwise null.
async function checkPersonnel(personnelId) {
  if (!personnelId) return null; // unassigned is allowed

  const [rows] = await db.query(
    "SELECT id, status FROM users WHERE id = ? AND role = 'Personnel' LIMIT 1",
    [personnelId]
  );

  if (rows.length === 0) return "Selected personnel does not exist.";
  if (rows[0].status === "Disabled") {
    return "Selected personnel account is disabled.";
  }
  return null;
}

// Returns true if this personnel is already booked at the same date and time.
async function hasConflict(
  personnelId,
  collectionDate,
  collectionTime,
  excludeId = null
) {
  if (!personnelId) return false;

  const [rows] = await db.query(
    `
      SELECT id FROM schedules
      WHERE assigned_personnel_id = ?
        AND collection_date = ?
        AND collection_time = ?
        AND status <> 'Cancelled'
        AND id <> ?
      LIMIT 1
    `,
    [personnelId, collectionDate, collectionTime, excludeId || 0]
  );

  return rows.length > 0;
}

// ==========================================
// CREATE SCHEDULE
// ==========================================

app.post("/schedules", async (req, res) => {
  try {
    const {
      collectionDate,
      collectionTime,
      area,
      wasteType,
      assignedPersonnelId,
      status,
      notes,
      createdBy,
    } = req.body;

    if (!collectionDate || !collectionTime || !area || !wasteType) {
      return res.status(400).json({
        success: false,
        message: "Collection date, time, area, and waste type are required.",
      });
    }

    const allowedStatuses = [
      "Scheduled",
      "In Progress",
      "Completed",
      "Cancelled",
    ];

    const scheduleStatus = status || "Scheduled";

    if (!allowedStatuses.includes(scheduleStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule status.",
      });
    }

    const personnelError = await checkPersonnel(assignedPersonnelId);
    if (personnelError) {
      return res.status(400).json({ success: false, message: personnelError });
    }

    if (await hasConflict(assignedPersonnelId, collectionDate, collectionTime)) {
      return res.status(409).json({
        success: false,
        message: "This personnel is already assigned at that date and time.",
      });
    }

    const [result] = await db.query(
      `
        INSERT INTO schedules (
          collection_date,
          collection_time,
          area,
          waste_type,
          assigned_personnel_id,
          status,
          notes,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        collectionDate,
        collectionTime,
        area,
        wasteType,
        assignedPersonnelId || null,
        scheduleStatus,
        notes || null,
        createdBy || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Schedule created successfully!",
      scheduleId: result.insertId,
    });
  } catch (error) {
    console.error("Create schedule error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create schedule.",
      error: error.message,
    });
  }
});

// ==========================================
// GET ALL SCHEDULES
// ==========================================

app.get("/schedules", async (req, res) => {
  try {
    const [schedules] = await db.query(`
      SELECT
        s.id,
        s.collection_date,
        s.collection_time,
        s.area,
        s.waste_type,
        s.assigned_personnel_id,
        s.status,
        s.notes,
        s.created_by,
        s.created_at,
        s.updated_at,
        u.full_name AS assigned_personnel_name
      FROM schedules s
      LEFT JOIN users u ON s.assigned_personnel_id = u.id
      ORDER BY s.collection_date ASC, s.collection_time ASC
    `);

    res.json({ success: true, schedules });
  } catch (error) {
    console.error("Get schedules error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve schedules.",
      error: error.message,
    });
  }
});

// ==========================================
// GET UPCOMING SCHEDULES - RESIDENT
// (must stay ABOVE "/schedules/:id")
// ==========================================

app.get("/schedules/resident/upcoming", async (req, res) => {
  try {
    const { area } = req.query;

    let sql = `
      SELECT
        id,
        DATE_FORMAT(collection_date, '%Y-%m-%d') AS collection_date,
        collection_time,
        area,
        waste_type,
        status,
        notes
      FROM schedules
      WHERE collection_date >= CURDATE()
        AND status IN ('Scheduled', 'In Progress')
    `;
    const params = [];

    if (area) {
      sql += " AND area = ?";
      params.push(area);
    }

    sql += " ORDER BY collection_date ASC, collection_time ASC";

    const [schedules] = await db.query(sql, params);

    res.json({ success: true, schedules });
  } catch (error) {
    console.error("Get resident schedules error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load schedules.",
      error: error.message,
    });
  }
});

// ==========================================
// GET SCHEDULES ASSIGNED TO PERSONNEL
// (must stay ABOVE "/schedules/:id")
// ==========================================

app.get("/schedules/personnel/:personnelId", async (req, res) => {
  try {
    const { personnelId } = req.params;

    const [schedules] = await db.query(
      `
        SELECT
          id,
          collection_date,
          collection_time,
          area,
          waste_type,
          assigned_personnel_id,
          status,
          notes,
          created_by,
          created_at,
          updated_at
        FROM schedules
        WHERE assigned_personnel_id = ?
        ORDER BY collection_date ASC, collection_time ASC
      `,
      [personnelId]
    );

    res.json({ success: true, schedules });
  } catch (error) {
    console.error("Get personnel schedules error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load personnel schedules.",
      error: error.message,
    });
  }
});

// ==========================================
// GET ONE SCHEDULE
// ==========================================

app.get("/schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [schedules] = await db.query(
      `
        SELECT
          s.id,
          s.collection_date,
          s.collection_time,
          s.area,
          s.waste_type,
          s.assigned_personnel_id,
          s.status,
          s.notes,
          s.created_by,
          s.created_at,
          s.updated_at,
          u.full_name AS assigned_personnel_name
        FROM schedules s
        LEFT JOIN users u ON s.assigned_personnel_id = u.id
        WHERE s.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found.",
      });
    }

    res.json({ success: true, schedule: schedules[0] });
  } catch (error) {
    console.error("Get schedule error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve schedule.",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE SCHEDULE
// ==========================================

app.put("/schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      collectionDate,
      collectionTime,
      area,
      wasteType,
      assignedPersonnelId,
      status,
      notes,
    } = req.body;

    if (!collectionDate || !collectionTime || !area || !wasteType) {
      return res.status(400).json({
        success: false,
        message: "Collection date, time, area, and waste type are required.",
      });
    }

    const scheduleStatus = status || "Scheduled";

    if (
      !["Scheduled", "In Progress", "Completed", "Cancelled"].includes(
        scheduleStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule status.",
      });
    }

    const personnelError = await checkPersonnel(assignedPersonnelId);
    if (personnelError) {
      return res.status(400).json({ success: false, message: personnelError });
    }

    if (
      await hasConflict(assignedPersonnelId, collectionDate, collectionTime, id)
    ) {
      return res.status(409).json({
        success: false,
        message: "This personnel is already assigned at that date and time.",
      });
    }

    const [result] = await db.query(
      `
        UPDATE schedules
        SET
          collection_date = ?,
          collection_time = ?,
          area = ?,
          waste_type = ?,
          assigned_personnel_id = ?,
          status = ?,
          notes = ?
        WHERE id = ?
      `,
      [
        collectionDate,
        collectionTime,
        area,
        wasteType,
        assignedPersonnelId || null,
        scheduleStatus,
        notes || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM schedules WHERE id = ? LIMIT 1",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found.",
        });
      }
    }

    res.json({
      success: true,
      message: "Schedule updated successfully!",
    });
  } catch (error) {
    console.error("Update schedule error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update schedule.",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE SCHEDULE STATUS
// ==========================================

app.put("/schedules/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Scheduled", "In Progress", "Completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule status.",
      });
    }

    const [result] = await db.query(
      "UPDATE schedules SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM schedules WHERE id = ? LIMIT 1",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found.",
        });
      }
    }

    res.json({
      success: true,
      message: `Schedule status updated to ${status}.`,
    });
  } catch (error) {
    console.error("Update schedule status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update schedule status.",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE SCHEDULE
// ==========================================

app.delete("/schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM schedules WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found.",
      });
    }

    res.json({
      success: true,
      message: "Schedule deleted successfully!",
    });
  } catch (error) {
    console.error("Delete schedule error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete schedule.",
      error: error.message,
    });
  }
});

// ==========================================
// GET RESIDENTS
// ==========================================

app.get("/users", async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, full_name, email, role, status, created_at
      FROM users
      WHERE role = 'Resident'
      ORDER BY id DESC
    `);

    res.json({ success: true, users });
  } catch (error) {
    console.error("Get residents error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve residents.",
      error: error.message,
    });
  }
});

// ==========================================
// ADD RESIDENT
// ==========================================

app.post("/users", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required.",
      });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `
        INSERT INTO users (
          full_name, email, password, role, status
        )
        VALUES (?, ?, ?, 'Resident', 'Active')
      `,
      [cleanName, cleanEmail, hashedPassword]
    );

    res.status(201).json({
      success: true,
      message: "Resident account created successfully!",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Create resident error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create resident account.",
      error: error.message,
    });
  }
});

// ==========================================
// EDIT RESIDENT
// ==========================================

app.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required.",
      });
    }

    const [result] = await db.query(
      `
        UPDATE users
        SET full_name = ?, email = ?
        WHERE id = ? AND role = 'Resident'
      `,
      [fullName.trim(), email.trim().toLowerCase(), id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM users WHERE id = ? AND role = 'Resident' LIMIT 1",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Resident not found.",
        });
      }
    }

    res.json({
      success: true,
      message: "Resident updated successfully!",
    });
  } catch (error) {
    console.error("Update resident error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update resident.",
      error: error.message,
    });
  }
});

// ==========================================
// ENABLE / DISABLE RESIDENT
// ==========================================

app.put("/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Disabled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Disabled.",
      });
    }

    const [result] = await db.query(
      `
        UPDATE users
        SET status = ?
        WHERE id = ? AND role = 'Resident'
      `,
      [status, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM users WHERE id = ? AND role = 'Resident' LIMIT 1",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Resident not found.",
        });
      }
    }

    res.json({
      success: true,
      message: `Resident ${status === "Active" ? "enabled" : "disabled"} successfully!`,
    });
  } catch (error) {
    console.error("Update resident status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update resident status.",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE RESIDENT
// ==========================================

app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM users WHERE id = ? AND role = 'Resident'",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Resident not found.",
      });
    }

    res.json({
      success: true,
      message: "Resident deleted successfully!",
    });
  } catch (error) {
    console.error("Delete resident error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete resident.",
      error: error.message,
    });
  }
});

// ==========================================
// GET PERSONNEL
// ==========================================

app.get("/personnel", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, full_name, email, role, status, created_at
      FROM users
      WHERE role = 'Personnel'
      ORDER BY id DESC
    `);

    res.json({ success: true, personnel: rows });
  } catch (error) {
    console.error("GET /personnel error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load personnel.",
      error: error.message,
    });
  }
});

// ==========================================
// ADD PERSONNEL
// ==========================================

app.post("/personnel", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required.",
      });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `
        INSERT INTO users (
          full_name, email, password, role, status
        )
        VALUES (?, ?, ?, 'Personnel', 'Active')
      `,
      [cleanName, cleanEmail, hashedPassword]
    );

    res.status(201).json({
      success: true,
      message: "Personnel account created successfully.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("POST /personnel error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create personnel.",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE PERSONNEL
// ==========================================

app.put("/personnel/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required.",
      });
    }

    const [result] = await db.query(
      `
        UPDATE users
        SET full_name = ?, email = ?
        WHERE id = ? AND role = 'Personnel'
      `,
      [fullName.trim(), email.trim().toLowerCase(), id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM users WHERE id = ? AND role = 'Personnel' LIMIT 1",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Personnel not found.",
        });
      }
    }

    res.json({
      success: true,
      message: "Personnel updated successfully.",
    });
  } catch (error) {
    console.error("PUT /personnel/:id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update personnel.",
      error: error.message,
    });
  }
});

// ==========================================
// ENABLE / DISABLE PERSONNEL
// ==========================================

app.put("/personnel/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Disabled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Disabled.",
      });
    }

    const [result] = await db.query(
      `
        UPDATE users
        SET status = ?
        WHERE id = ? AND role = 'Personnel'
      `,
      [status, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM users WHERE id = ? AND role = 'Personnel' LIMIT 1",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Personnel not found.",
        });
      }
    }

    res.json({
      success: true,
      message: `Personnel ${status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    console.error("PUT /personnel/:id/status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update personnel status.",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE PERSONNEL
// ==========================================

app.delete("/personnel/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM users WHERE id = ? AND role = 'Personnel'",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Personnel not found.",
      });
    }

    res.json({
      success: true,
      message: "Personnel deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /personnel/:id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete personnel.",
      error: error.message,
    });
  }
});

// ==========================================
// DEFAULT ADMIN ACCOUNT
// Login: admin@example.com / Admin123
// ==========================================

async function ensureAdmin() {
  try {
    const email = "admin@example.com";
    const hash = await bcrypt.hash("Admin123", 10);

    const [rows] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      await db.query(
        `
          INSERT INTO users (
            full_name, email, password, role, status
          )
          VALUES (?, ?, ?, 'Admin', 'Active')
        `,
        ["Administrator", email, hash]
      );

      console.log("Default admin created");
    } else {
      // Preserves the existing behavior of resetting the default
      // admin password each time the backend starts.
      await db.query(
        `
          UPDATE users
          SET password = ?, role = 'Admin', status = 'Active'
          WHERE email = ?
        `,
        [hash, email]
      );

      console.log("Default admin reset");
    }
  } catch (error) {
    console.error("ensureAdmin error:", error.message);
  }
}
// ===== RESIDENT COLLECTION HISTORY (READ-ONLY) =====
app.get("/schedules/resident/history", async (req, res) => {
  try {
    const { area } = req.query;
    let sql = `
      SELECT id,
        DATE_FORMAT(collection_date, '%Y-%m-%d') AS collection_date,
        collection_time, area, waste_type, status, notes
      FROM schedules
      WHERE (collection_date < CURDATE() OR status IN ('Completed', 'Cancelled'))
    `;
    const params = [];
    if (area) {
      sql += " AND area = ?";
      params.push(area);
    }
    sql += " ORDER BY collection_date DESC, collection_time DESC LIMIT 200";
    const [schedules] = await db.query(sql, params);
    res.json({ success: true, schedules });
  } catch (error) {
    console.error("Get resident history error:", error);
    res.status(500).json({ success: false, message: "Failed to load collection history." });
  }
});

// ===== RESIDENT PROFILE SETTINGS =====
app.get("/users/:id/profile", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: "A valid user ID is required." });
    }
    const [rows] = await db.query(
      "SELECT id, full_name, email, role, status FROM users WHERE id = ? AND role = 'Resident' LIMIT 1",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Resident not found." });
    }
    res.json({
      success: true,
      user: {
        id: rows[0].id,
        fullName: rows[0].full_name,
        email: rows[0].email,
        role: rows[0].role,
        status: rows[0].status,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Failed to load profile." });
  }
});

app.put("/users/:id/profile", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { fullName, email, currentPassword, newPassword } = req.body;
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: "A valid user ID is required." });
    }
    const cleanName = String(fullName || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanName || !cleanEmail) {
      return res.status(400).json({ success: false, message: "Full name and email are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    const [rows] = await db.query(
      "SELECT id, password FROM users WHERE id = ? AND role = 'Resident' LIMIT 1",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Resident not found." });
    }
    const [duplicate] = await db.query(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [cleanEmail, id]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ success: false, message: "That email is already used by another account." });
    }
    let hashedPassword = null;
    if (newPassword) {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
      }
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Enter your current password to set a new one." });
      }
      const matches = await bcrypt.compare(String(currentPassword), rows[0].password);
      if (!matches) {
        return res.status(401).json({ success: false, message: "Current password is incorrect." });
      }
      hashedPassword = await bcrypt.hash(String(newPassword), 10);
    }
    if (hashedPassword) {
      await db.query(
        "UPDATE users SET full_name = ?, email = ?, password = ? WHERE id = ?",
        [cleanName, cleanEmail, hashedPassword, id]
      );
    } else {
      await db.query(
        "UPDATE users SET full_name = ?, email = ? WHERE id = ?",
        [cleanName, cleanEmail, id]
      );
    }
    res.json({
      success: true,
      message: "Profile updated successfully!",
      user: { id, fullName: cleanName, email: cleanEmail, role: "Resident" },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Failed to update profile." });
  }
});

// ==========================================
// 404 HANDLER (must stay after all routes)
// ==========================================

app.use((req, res) => {
  console.log("API ROUTE NOT FOUND:", req.method, req.originalUrl);

  return res.status(404).json({
    success: false,
    message: "API route not found.",
    method: req.method,
    path: req.originalUrl,
  });
});

// ==========================================
// START SERVER - ONLY ONCE
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  void ensureAdmin();
});