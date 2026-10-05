require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.json({
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

    if (!input || !input.trim()) {
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
      },
    );

    const text = await googleResponse.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        success: false,
        message: "Invalid response from Google Places.",
        raw: text,
      });
    }

    if (!googleResponse.ok) {
      console.error("Google Places Autocomplete Error:", data);

      return res.status(googleResponse.status).json({
        success: false,
        message: data?.error?.message || "Google Places autocomplete failed.",
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
      },
    );

    const text = await googleResponse.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        success: false,
        message: "Invalid response from Google Places.",
        raw: text,
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
// SUBMIT REPORT
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
      placeName || null,
      placeAddress || null,
      latitude || null,
      longitude || null,
      area || null,
      collectionDate || null,
      collectionTime || null,
      wasteType || null,
      status || "Reported",
    ];

    const [result] = await db.query(sql, values);

    console.log("Report saved successfully. ID:", result.insertId);

    res.json({
      success: true,
      message: "Report submitted successfully!",
      reportId: result.insertId,
    });
  } catch (error) {
    console.error("Report submission error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit report",
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

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const sql = `
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
      `;

    const [reports] = await db.query(sql, [userId]);

    res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Get reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get reports",
      error: error.message,
    });
  }
});

// ==========================================
// REGISTER
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

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
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
      [fullName, email, hashedPassword],
    );

    console.log("User registered successfully. ID:", result.insertId);

    res.json({
      success: true,
      message: "Registration successful!",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Registration error:", error);

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
        SELECT
          id,
          full_name,
          email,
          password,
          role,
          status
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
      [email],
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
        message:
          "This account has been disabled. Please contact the administrator.",
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
// SCHEDULE MANAGEMENT
// ==========================================

// CREATE SCHEDULE
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

    const [result] = await db.query(
      `
        INSERT INTO schedules
        (
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
        status || "Scheduled",
        notes || null,
        createdBy || null,
      ],
    );

    res.json({
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

// GET ALL SCHEDULES
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
        LEFT JOIN users u
          ON s.assigned_personnel_id = u.id
        ORDER BY
          s.collection_date ASC,
          s.collection_time ASC
      `);

    res.json({
      success: true,
      schedules,
    });
  } catch (error) {
    console.error("Get schedules error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve schedules.",
      error: error.message,
    });
  }
});

// GET ONE SCHEDULE
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
        LEFT JOIN users u
          ON s.assigned_personnel_id = u.id
        WHERE s.id = ?
        LIMIT 1
        `,
      [id],
    );

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found.",
      });
    }

    res.json({
      success: true,
      schedule: schedules[0],
    });
  } catch (error) {
    console.error("Get schedule error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve schedule.",
      error: error.message,
    });
  }
});

// UPDATE SCHEDULE
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
        status || "Scheduled",
        notes || null,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found.",
      });
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

// DELETE SCHEDULE
app.delete("/schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM schedules WHERE id = ?", [id]);

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
// ADMIN - RESIDENT MANAGEMENT
// ==========================================

// GET ALL RESIDENTS
app.get("/users", async (req, res) => {
  try {
    const [users] = await db.query(`
        SELECT
          id,
          full_name,
          email,
          role,
          status,
          created_at
        FROM users
        WHERE role = 'Resident'
        ORDER BY id DESC
      `);

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get residents error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve residents.",
      error: error.message,
    });
  }
});

// ADD RESIDENT
app.post("/users", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required.",
      });
    }

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
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
      [fullName, email, hashedPassword],
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

// EDIT RESIDENT
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
        SET
          full_name = ?,
          email = ?
        WHERE id = ?
          AND role = 'Resident'
        `,
      [fullName, email, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Resident not found.",
      });
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

// ENABLE / DISABLE RESIDENT
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
        WHERE id = ?
          AND role = 'Resident'
        `,
      [status, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Resident not found.",
      });
    }

    res.json({
      success: true,
      message: `Resident ${
        status === "Active" ? "enabled" : "disabled"
      } successfully!`,
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

// DELETE RESIDENT
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
        DELETE FROM users
        WHERE id = ?
          AND role = 'Resident'
        `,
      [id],
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

// ===============================
// PERSONNEL MANAGEMENT
// ===============================

// GET all personnel
app.get("/personnel", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name, email, role, status, created_at
       FROM users
       WHERE role = 'Personnel'
       ORDER BY id DESC`,
    );

    res.json({
      success: true,
      personnel: rows,
    });
  } catch (error) {
    console.error("GET /personnel error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load personnel",
      error: error.message,
    });
  }
});

// ADD personnel
app.post("/personnel", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required",
      });
    }

    const bcrypt = require("bcryptjs");

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users
       (full_name, email, password, role, status)
       VALUES (?, ?, ?, 'Personnel', 'Active')`,
      [fullName.trim(), email.trim(), hashedPassword],
    );

    res.json({
      success: true,
      message: "Personnel account created successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("POST /personnel error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create personnel",
      error: error.message,
    });
  }
});

// UPDATE personnel
app.put("/personnel/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required",
      });
    }

    const [result] = await db.query(
      `UPDATE users
       SET full_name = ?, email = ?
       WHERE id = ? AND role = 'Personnel'`,
      [fullName.trim(), email.trim(), id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Personnel not found",
      });
    }

    res.json({
      success: true,
      message: "Personnel updated successfully",
    });
  } catch (error) {
    console.error("PUT /personnel/:id error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update personnel",
      error: error.message,
    });
  }
});

// ENABLE / DISABLE personnel
app.put("/personnel/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Disabled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Disabled",
      });
    }

    const [result] = await db.query(
      `UPDATE users
       SET status = ?
       WHERE id = ? AND role = 'Personnel'`,
      [status, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Personnel not found",
      });
    }

    res.json({
      success: true,
      message: `Personnel ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("PUT /personnel/:id/status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update personnel status",
      error: error.message,
    });
  }
});

// DELETE personnel
app.delete("/personnel/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE FROM users
       WHERE id = ? AND role = 'Personnel'`,
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Personnel not found",
      });
    }

    res.json({
      success: true,
      message: "Personnel deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /personnel/:id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete personnel",
      error: error.message,
    });
  }
});

// ==========================================
// PERSONNEL SCHEDULES
// ==========================================

// Get schedules assigned to a specific personnel
app.get("/schedules/personnel/:personnelId", (req, res) => {
  const personnelId = req.params.personnelId;

  const sql = `
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
  `;

  db.query(sql, [personnelId], (err, results) => {
    if (err) {
      console.error("Get personnel schedules error:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to load personnel schedules",
      });
    }

    res.json({
      success: true,
      schedules: results,
    });
  });
});

// ==========================================
// UPDATE SCHEDULE STATUS
// ==========================================

app.put("/schedules/:id/status", (req, res) => {
  const scheduleId = req.params.id;
  const { status } = req.body;

  const allowedStatuses = ["Scheduled", "In Progress", "Completed"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid schedule status",
    });
  }

  const sql = `
    UPDATE schedules
    SET status = ?
    WHERE id = ?
  `;

  db.query(sql, [status, scheduleId], (err, result) => {
    if (err) {
      console.error("Update schedule status error:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to update schedule status",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    res.json({
      success: true,
      message: `Schedule status updated to ${status}`,
    });
  });
});

// ==========================================
// START SERVER
// ==========================================

const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://192.168.1.28:${PORT}`);
});
