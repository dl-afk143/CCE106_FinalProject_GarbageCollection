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
// SUBMIT REPORT
// ==========================================

app.post("/reports", async (req, res) => {
  try {
    const {
      issue,
      description,
      photo,
      latitude,
      longitude,
      area,
      collectionDate,
      collectionTime,
      wasteType,
      status,
    } = req.body;

    if (!issue || !description) {
      return res.status(400).json({
        success: false,
        message: "Issue and description are required.",
      });
    }

    const sql = `
      INSERT INTO reports (
        issue,
        description,
        photo,
        latitude,
        longitude,
        area,
        collection_date,
        collection_time,
        waste_type,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      issue,
      description,
      photo || null,
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
        role
      )
      VALUES (?, ?, ?, ?)
      `,
      [fullName, email, hashedPassword, "user"],
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
      "SELECT id, full_name, email, password, role FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = users[0];

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
// START SERVER
// ==========================================

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
