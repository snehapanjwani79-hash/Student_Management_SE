require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(__dirname));

// ==========================================
// MongoDB Schema & Model
// ==========================================
const studentSchema = new mongoose.Schema({
  admissionNo: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dob: {
    type: String,
    required: true
  },
  personalEmail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  allocatedEmail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  parentName: {
    type: String,
    default: '',
    trim: true
  },
  parentPhone: {
    type: String,
    default: '',
    trim: true
  },
  parentEmail: {
    type: String,
    default: '',
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    required: true,
    trim: true
  },
  bloodGroup: {
    type: String,
    default: 'O+',
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  _version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

const Student = mongoose.model('Student', studentSchema);

// Initial Sample Seed Data
const SAMPLE_STUDENTS = [
  {
    admissionNo: '24CSE001',
    name: 'Aarav Sharma',
    dob: '2004-06-15',
    personalEmail: 'aarav.sharma2004@gmail.com',
    allocatedEmail: 'aarav.sharma@bmu.edu.in',
    phone: '9876543210',
    parentName: 'Ramesh Sharma',
    parentPhone: '9811122233',
    parentEmail: 'ramesh.sharma@gmail.com',
    address: 'Flat 402, Nirvana Country, Sector 50, Gurugram, Haryana - 122018',
    course: 'B.Tech - Computer Science & Engineering',
    section: 'CSE-A',
    bloodGroup: 'B+',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    _version: 1
  },
  {
    admissionNo: '24CSE042',
    name: 'Sneha Panjwani',
    dob: '2004-09-22',
    personalEmail: 'sneha.panjwani.work@gmail.com',
    allocatedEmail: 'sneha.panjwani@bmu.edu.in',
    phone: '9812345678',
    parentName: 'Rajesh Panjwani',
    parentPhone: '9822233344',
    parentEmail: 'rajesh.panjwani@yahoo.com',
    address: 'House 12, Sushant Lok Phase 1, Gurugram, Haryana - 122009',
    course: 'B.Tech - Computer Science & Engineering',
    section: 'CSE-B',
    bloodGroup: 'O+',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    _version: 1
  },
  {
    admissionNo: '24MBA015',
    name: 'Rohan Verma',
    dob: '2001-11-04',
    personalEmail: 'rohan.verma.personal@yahoo.com',
    allocatedEmail: 'rohan.verma@bmu.edu.in',
    phone: '9845612300',
    parentName: 'Sanjay Verma',
    parentPhone: '9845612399',
    parentEmail: 'sanjay.verma@gmail.com',
    address: 'B-24, DLF Phase 2, Gurugram, Haryana - 122002',
    course: 'MBA - Business Analytics',
    section: 'MBA-C',
    bloodGroup: 'A+',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    _version: 1
  },
  {
    admissionNo: '24BBA088',
    name: 'Priya Patel',
    dob: '2005-02-18',
    personalEmail: 'priya.patel.official@outlook.com',
    allocatedEmail: 'priya.patel@bmu.edu.in',
    phone: '9899887766',
    parentName: 'Deepak Patel',
    parentPhone: '9899887700',
    parentEmail: 'deepak.patel@outlook.com',
    address: 'Tower 3, Crest Apartments, Golf Course Road, Gurugram - 122003',
    course: 'BBA - Digital Marketing',
    section: 'BBA-C',
    bloodGroup: 'AB+',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    _version: 1
  }
];

// Seed DB function
async function seedDatabaseIfEmpty() {
  try {
    const count = await Student.countDocuments();
    if (count === 0) {
      console.log('Seeding initial students into MongoDB...');
      await Student.insertMany(SAMPLE_STUDENTS);
      console.log('Database seeded successfully with 4 sample students.');
    } else {
      console.log(`Database already has ${count} student records.`);
    }
  } catch (err) {
    console.error('Error seeding database:', err.message);
  }
}

// ==========================================
// Helper Business Logic
// ==========================================

// Allot Section by Student Name
function allotSection(name, course) {
  const cleanName = (name || '').trim().toUpperCase();
  const firstChar = cleanName.charAt(0) || 'A';

  let progPrefix = 'CSE';
  const cUpper = (course || '').toUpperCase();
  if (cUpper.includes('MBA')) progPrefix = 'MBA';
  else if (cUpper.includes('BBA')) progPrefix = 'BBA';

  let sectionLetter = 'A';
  if (firstChar >= 'A' && firstChar <= 'F') {
    sectionLetter = 'A';
  } else if (firstChar >= 'G' && firstChar <= 'L') {
    sectionLetter = 'B';
  } else if (firstChar >= 'M' && firstChar <= 'R') {
    sectionLetter = 'C';
  } else {
    sectionLetter = 'D';
  }
  return `${progPrefix}-${sectionLetter}`;
}

// Generate unique 8-character Admission Number
function generateAdmissionNo(course, allStudents) {
  const year = '24';
  let prog = 'CSE';
  const cUpper = (course || '').toUpperCase();
  if (cUpper.includes('MBA')) prog = 'MBA';
  else if (cUpper.includes('BBA')) prog = 'BBA';
  else if (cUpper.includes('ECE')) prog = 'ECE';
  else if (cUpper.includes('LAW')) prog = 'LAW';

  const prefix = `${year}${prog}`;
  let maxSeq = 0;
  allStudents.forEach(s => {
    if (s.admissionNo && s.admissionNo.toUpperCase().startsWith(prefix)) {
      const numPart = parseInt(s.admissionNo.substring(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

// Generate institutional BMU email
function generateAllocatedEmail(name, allStudents, excludeAdmissionNo = null) {
  const parts = (name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ? parts[0].replace(/[^a-z0-9]/g, '') : 'student';
  const lastName = parts.length > 1 ? parts[parts.length - 1].replace(/[^a-z0-9]/g, '') : '';
  const baseHandle = lastName ? `${firstName}.${lastName}` : firstName;

  let candidate = `${baseHandle}@bmu.edu.in`;
  let counter = 2;

  const isTaken = (email) => allStudents.some(s => {
    if (excludeAdmissionNo && s.admissionNo.toUpperCase() === excludeAdmissionNo.toUpperCase()) {
      return false;
    }
    return (s.allocatedEmail || '').toLowerCase() === email.toLowerCase();
  });

  while (isTaken(candidate)) {
    candidate = `${baseHandle}${counter}@bmu.edu.in`;
    counter++;
  }

  return candidate;
}

// Full Field Validation
function validateStudent(data, isUpdate = false, existingAdmNo = null, allStudents = []) {
  const errors = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Student Name is required.';
  } else if (data.name.trim().length < 3) {
    errors.name = 'Student Name must be at least 3 characters.';
  } else if (!/^[a-zA-Z\s.'-]+$/.test(data.name.trim())) {
    errors.name = 'Student Name can only contain letters, spaces, dots, and hyphens.';
  }

  if (!data.dob) {
    errors.dob = 'Date of Birth is required.';
  } else {
    const dobDate = new Date(data.dob);
    const today = new Date();
    if (isNaN(dobDate.getTime()) || dobDate >= today) {
      errors.dob = 'Date of birth must be a valid past date.';
    }
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const cleanPersonalEmail = (data.personalEmail || data.email || '').toString().trim().toLowerCase();

  if (!cleanPersonalEmail) {
    errors.personalEmail = 'Personal Email address is required.';
  } else if (!emailRegex.test(cleanPersonalEmail)) {
    errors.personalEmail = 'Please provide a valid personal email format (e.g., student@gmail.com).';
  } else if (cleanPersonalEmail.endsWith('@bmu.edu.in')) {
    errors.personalEmail = 'Personal email cannot end with @bmu.edu.in!';
  } else {
    const dup = allStudents.find(s => {
      if (isUpdate && existingAdmNo && s.admissionNo.toUpperCase() === existingAdmNo.toUpperCase()) return false;
      return (s.personalEmail || '').toLowerCase() === cleanPersonalEmail;
    });
    if (dup) {
      errors.personalEmail = `Personal email '${cleanPersonalEmail}' is already registered to ${dup.name} (${dup.admissionNo}).`;
    }
  }

  const cleanPhone = (data.phone || '').toString().trim().replace(/[\s-]/g, '');
  if (!cleanPhone) {
    errors.phone = 'Student phone number is required.';
  } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    errors.phone = 'Student phone number must be a valid 10-digit Indian number starting with 6-9.';
  } else {
    const dupPhone = allStudents.find(s => {
      if (isUpdate && existingAdmNo && s.admissionNo.toUpperCase() === existingAdmNo.toUpperCase()) return false;
      return (s.phone || '').toString().replace(/[\s-]/g, '') === cleanPhone;
    });
    if (dupPhone) {
      errors.phone = `Phone number '${cleanPhone}' is already registered to ${dupPhone.name} (${dupPhone.admissionNo}).`;
    }
  }

  if (data.parentPhone) {
    const cleanParent = data.parentPhone.toString().trim().replace(/[\s-]/g, '');
    if (cleanParent && !/^[6-9]\d{9}$/.test(cleanParent)) {
      errors.parentPhone = 'Parent phone number must be a valid 10-digit number.';
    }
  }

  if (!data.address || !data.address.trim()) {
    errors.address = 'Residential Address is required.';
  } else if (data.address.trim().length < 8) {
    errors.address = 'Address is too short (min 8 characters required).';
  }

  if (!data.course || !data.course.trim()) {
    errors.course = 'Course / Program is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// ==========================================
// REST API Routes
// ==========================================

// Health / Status Check
app.get('/api/health', async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const count = isConnected ? await Student.countDocuments() : 0;
  res.json({
    status: 'ok',
    database: isConnected ? 'Connected (MongoDB Atlas)' : 'Connecting...',
    studentCount: count,
    timestamp: new Date().toISOString()
  });
});

// GET all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ admissionNo: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET student by admission number
app.get('/api/students/:admissionNo', async (req, res) => {
  try {
    const cleanAdm = req.params.admissionNo.trim().toUpperCase();
    const student = await Student.findOne({ admissionNo: cleanAdm });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST register student (TC1, Unique Constraints, Auto-Allotments)
app.post('/api/students', async (req, res) => {
  try {
    const allStudents = await Student.find();
    const data = req.body;

    // Check or auto-allot admission number
    let finalAdmissionNo = '';
    if (data.admissionNo && data.admissionNo.toString().trim()) {
      const cleanAdm = data.admissionNo.toString().trim().toUpperCase();
      const existingAdm = allStudents.find(s => s.admissionNo.toUpperCase() === cleanAdm);
      if (existingAdm) {
        return res.status(400).json({
          success: false,
          errorType: 'DUPLICATE_ADMISSION_NO',
          message: `TC1 VIOLATION PREVENTED: Student record with Admission No '${cleanAdm}' already exists (${existingAdm.name}). Duplicate admission numbers are strictly rejected.`,
          existingRecord: existingAdm
        });
      }
      finalAdmissionNo = cleanAdm;
    } else {
      finalAdmissionNo = generateAdmissionNo(data.course, allStudents);
    }

    // Auto-allot section based on alphabetical name
    const finalSection = allotSection(data.name, data.course);

    // Auto-allot institutional BMU email
    const finalAllocatedEmail = generateAllocatedEmail(data.name, allStudents);

    // Validate
    const validation = validateStudent(data, false, null, allStudents);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorType: 'VALIDATION_FAILED',
        message: 'Validation failed. Please correct input fields.',
        errors: validation.errors
      });
    }

    // Create student document
    const newStudent = new Student({
      admissionNo: finalAdmissionNo,
      name: data.name.trim(),
      dob: data.dob,
      personalEmail: (data.personalEmail || data.email).trim().toLowerCase(),
      allocatedEmail: finalAllocatedEmail,
      phone: data.phone.toString().trim().replace(/[\s-]/g, ''),
      parentName: (data.parentName || '').trim(),
      parentPhone: (data.parentPhone || '').trim(),
      parentEmail: (data.parentEmail || '').trim(),
      address: data.address.trim(),
      course: data.course.trim(),
      section: finalSection,
      bloodGroup: data.bloodGroup || 'O+',
      avatar: data.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name.trim())}`,
      _version: 1
    });

    const saved = await newStudent.save();

    res.status(201).json({
      success: true,
      message: `Student registered successfully! Admission No: ${saved.admissionNo}, Section: ${saved.section}, BMU Mail: ${saved.allocatedEmail}`,
      student: saved
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'unique field';
      return res.status(400).json({
        success: false,
        errorType: 'DUPLICATE_KEY',
        message: `A record with this ${field} already exists in MongoDB! Please provide a unique value.`
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update student (TC2: Atomic Rollback + TC3: OCC Version Check)
app.put('/api/students/:admissionNo', async (req, res) => {
  try {
    const cleanAdm = req.params.admissionNo.trim().toUpperCase();
    const current = await Student.findOne({ admissionNo: cleanAdm });

    if (!current) {
      return res.status(404).json({ success: false, message: `Student '${cleanAdm}' not found.` });
    }

    const { updatedFields, expectedVersion } = req.body;

    // TC3: Optimistic Concurrency Control Check
    if (expectedVersion !== undefined && expectedVersion !== null) {
      const expected = parseInt(expectedVersion, 10);
      const actual = current._version || 1;
      if (expected !== actual) {
        return res.status(409).json({
          success: false,
          errorType: 'CONCURRENCY_CONFLICT',
          message: `TC3 CONFLICT DETECTED: Record was modified by another user. Your version was v${expected}, but the latest record version in MongoDB is v${actual}. Update rejected to prevent silent overwrite.`,
          currentVersion: actual,
          attemptedVersion: expected,
          currentRecord: current
        });
      }
    }

    const allStudents = await Student.find();

    // Staged merge
    const staged = {
      ...current.toObject(),
      ...updatedFields,
      admissionNo: current.admissionNo,
      allocatedEmail: current.allocatedEmail
    };

    // TC2: Data Integrity Check
    const validation = validateStudent(staged, true, cleanAdm, allStudents);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorType: 'VALIDATION_FAILED',
        message: `TC2 DATA INTEGRITY ENFORCED: Invalid input in [${Object.keys(validation.errors).join(', ')}]. Transaction rolled back - NO partial updates saved.`,
        errors: validation.errors,
        originalRecord: current
      });
    }

    // Atomic update
    current.name = staged.name.trim();
    current.dob = staged.dob;
    current.personalEmail = staged.personalEmail.trim().toLowerCase();
    current.phone = staged.phone.toString().trim().replace(/[\s-]/g, '');
    current.parentName = (staged.parentName || '').trim();
    current.parentPhone = (staged.parentPhone || '').trim();
    current.parentEmail = (staged.parentEmail || '').trim();
    current.address = staged.address.trim();
    current.course = staged.course.trim();
    current.section = staged.section.trim();
    current.bloodGroup = staged.bloodGroup || 'O+';
    if (staged.avatar) current.avatar = staged.avatar;

    // Increment OCC version
    current._version = (current._version || 1) + 1;

    const updated = await current.save();

    res.json({
      success: true,
      message: `Student details updated successfully! Record version incremented to v${updated._version}.`,
      student: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE student
app.delete('/api/students/:admissionNo', async (req, res) => {
  try {
    const cleanAdm = req.params.admissionNo.trim().toUpperCase();
    const deleted = await Student.findOneAndDelete({ admissionNo: cleanAdm });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.json({ success: true, message: `Student ${cleanAdm} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST reset to sample data
app.post('/api/students/reset', async (req, res) => {
  try {
    await Student.deleteMany({});
    await Student.insertMany(SAMPLE_STUDENTS);
    res.json({ success: true, message: 'Database reset to initial sample data successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// Database Connection & Server Start
// ==========================================
let mongoUri = (process.env.MONGO_URI || '').trim();
if (!mongoUri) {
  console.error('FATAL: MONGO_URI is missing in .env file!');
  process.exit(1);
}

// Ensure database name and options in connection URI
if (!mongoUri.includes('?')) {
  mongoUri = mongoUri.replace(/\/?$/, '/student_portal?retryWrites=true&w=majority');
}

console.log('Connecting to MongoDB Atlas...');
async function startServer() {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      family: 4
    });
    console.log('✅ Connected to MongoDB Atlas successfully!');
    await seedDatabaseIfEmpty();

    app.listen(PORT, () => {
      console.log(`🚀 Student Management Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    setTimeout(startServer, 3000);
  }
}

startServer();

