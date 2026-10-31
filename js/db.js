/**
 * Student Management Portal - Mock Database & Concurrency Control Layer
 * Implements:
 * - LocalStorage persistence with multi-tab BroadcastChannel synchronization
 * - Optimistic Concurrency Control (OCC) using record versioning (_version)
 * - Atomic validation & transactional rollbacks (TC2)
 * - Unique constraint checking for Student Admission No, Student Phone, and Personal Email
 * - Automated BMU Institutional Email Allocation (e.g. sneha.panjwani@bmu.edu.in, sneha.panjwani2@bmu.edu.in)
 * - Sibling Parent Record Support (Duplicate parent details allowed, student records strictly unique)
 * - Consistent 8-character Admission Number format enforcement (e.g. 24CSE001, 24MBA015)
 */

const STORAGE_KEY = 'bmu_student_management_db_v3';
const SYNC_CHANNEL = 'bmu_student_db_sync_bus_v3';

// Seed Initial Data (BML Munjal University format)
const INITIAL_STUDENTS = [
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
    _version: 1,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
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
    _version: 1,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    admissionNo: '24MBA015',
    name: 'Rohan Verma',
    dob: '2001-11-04',
    personalEmail: 'rohan.verma.personal@yahoo.com',
    allocatedEmail: 'rohan.verma@bmu.edu.in',
    phone: '9123456780',
    parentName: 'Vikram Verma',
    parentPhone: '9833344455',
    parentEmail: 'vikram.verma@outlook.com',
    address: 'Tower 4, DLF Phase 5, Golf Course Road, Gurugram - 122002',
    course: 'MBA - Business Analytics',
    section: 'MBA-1',
    bloodGroup: 'A+',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    _version: 1,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    admissionNo: '24BBA088',
    name: 'Priya Iyer',
    dob: '2005-03-18',
    personalEmail: 'priya.iyer.personal@outlook.com',
    allocatedEmail: 'priya.iyer@bmu.edu.in',
    phone: '9789012345',
    parentName: 'Suresh Iyer',
    parentPhone: '9844455566',
    parentEmail: 'suresh.iyer@gmail.com',
    address: 'B-24, South City II, Gurugram, Haryana - 122018',
    course: 'BBA - Digital Marketing',
    section: 'BBA-2',
    bloodGroup: 'AB+',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    _version: 1,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

class StudentDatabase {
  constructor() {
    this.broadcastChannel = null;
    this.listeners = [];
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      this._saveToStorage(INITIAL_STUDENTS);
    }

    // Setup Cross-tab Broadcast Channel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(SYNC_CHANNEL);
        this.broadcastChannel.onmessage = (event) => {
          this._notifyListeners(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported, falling back to window storage events.', e);
      }
    }

    // Fallback storage event for tabs
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        this._notifyListeners({ type: 'STORAGE_SYNC', timestamp: Date.now() });
      }
    });

    // Auto-sync with MongoDB Atlas Backend
    this.syncWithBackend();
    window.addEventListener('focus', () => this.syncWithBackend());
    setInterval(() => this.syncWithBackend(), 15000);
  }

  async syncWithBackend() {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const remoteStudents = await res.json();
        if (Array.isArray(remoteStudents) && remoteStudents.length > 0) {
          this._saveToStorage(remoteStudents);
          this._notifyListeners({ type: 'BACKEND_SYNC', timestamp: Date.now() });
          const badge = document.getElementById('dbSyncStatus');
          if (badge) badge.textContent = 'MongoDB Atlas Connected';
        }
      }
    } catch (err) {
      console.warn('Backend sync:', err.message);
    }
  }

  onSync(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _notifyListeners(eventData) {
    this.listeners.forEach(cb => {
      try {
        cb(eventData);
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    });
  }

  _broadcast(eventData) {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(eventData);
    }
    this._notifyListeners(eventData);
  }

  _getFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const list = data ? JSON.parse(data) : [];
      return Array.isArray(list) ? list.filter(s => s && s.admissionNo) : [];
    } catch (e) {
      console.error('Failed to read localStorage:', e);
      return [];
    }
  }

  _saveToStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Reset database to initial sample data
   */
  resetToSampleData() {
    this._saveToStorage(INITIAL_STUDENTS);
    this._broadcast({ type: 'DATABASE_RESET', timestamp: Date.now() });
    return true;
  }

  /**
   * Allocates an official institutional BMU email for student
   * Format: firstname.lastname@bmu.edu.in
   * If collision occurs, increments index: firstname.lastname2@bmu.edu.in, firstname.lastname3@bmu.edu.in, etc.
   */
  generateAllocatedEmail(name, currentStudents, excludeAdmissionNo = null) {
    const parts = (name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ? parts[0].replace(/[^a-z0-9]/g, '') : 'student';
    const lastName = parts.length > 1 ? parts[parts.length - 1].replace(/[^a-z0-9]/g, '') : '';
    const baseHandle = lastName ? `${firstName}.${lastName}` : firstName;

    let candidate = `${baseHandle}@bmu.edu.in`;
    let counter = 2;

    const isTaken = (email) => currentStudents.some(s => {
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

  /**
   * Automatically generate next unique consistent 8-character Admission Number
   * Format: 2-digit year (24) + 3-character program code (CSE/MBA/BBA) + 3-digit sequence
   */
  generateAdmissionNo(course, currentStudents) {
    const year = '24';
    let prog = 'CSE';
    const cUpper = (course || '').toUpperCase();
    if (cUpper.includes('MBA')) prog = 'MBA';
    else if (cUpper.includes('BBA')) prog = 'BBA';
    else if (cUpper.includes('ECE')) prog = 'ECE';
    else if (cUpper.includes('LAW')) prog = 'LAW';

    const prefix = `${year}${prog}`;
    let maxSeq = 0;
    currentStudents.forEach(s => {
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

  /**
   * Hardcoded Rule: Allot Section based on alphabetical order of Student Name
   * A - F -> Section A (e.g. CSE-A)
   * G - L -> Section B (e.g. CSE-B)
   * M - R -> Section C (e.g. CSE-C)
   * S - Z -> Section D (e.g. CSE-D)
   */
  allotSection(name, course) {
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

  /**
   * Comprehensive validation engine
   * Enforces:
   * 1. Consistent 8-character Admission No format: 2 digits year + 3 letters branch + 3 digits roll (e.g. 24CSE001)
   * 2. Full Name validation
   * 3. Valid past Date of Birth
   * 4. Personal Email validation: must NOT end with @bmu.edu.in (student inputs personal email)
   * 5. Unique 10-digit Indian mobile number for Student
   * 6. Valid Parent details (Name, Phone, Email) - Duplicates allowed for siblings!
   * 7. Address, Course, and Section validation
   */
  validateStudent(data, isUpdate = false, existingAdmissionNo = null) {
    const errors = {};
    const students = this._getFromStorage();

    // 1. Consistent Admission Number format (validated if provided, or during updates)
    if (data.admissionNo) {
      const cleanAdm = data.admissionNo.toString().trim().toUpperCase();
      const admFormatRegex = /^[0-9]{2}[A-Z]{3}[0-9]{3}$/;
      if (cleanAdm.length !== 8) {
        errors.admissionNo = `Admission Number length must be consistently exactly 8 characters (e.g. 24CSE001). Given: ${cleanAdm.length} characters.`;
      } else if (!admFormatRegex.test(cleanAdm)) {
        errors.admissionNo = 'Admission Number format must be consistent: 2 digits year + 3 uppercase program letters + 3 digits roll (e.g. 24CSE001, 24MBA015).';
      }
    } else if (isUpdate) {
      errors.admissionNo = 'Admission Number is mandatory for updates.';
    }

    // 2. Full Name
    if (!data.name || !data.name.trim()) {
      errors.name = 'Full Student Name is required.';
    } else if (data.name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters.';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(data.name.trim())) {
      errors.name = 'Name should only contain letters and standard punctuation.';
    }

    // 3. Date of Birth
    if (!data.dob) {
      errors.dob = 'Date of Birth is required.';
    } else {
      const dobDate = new Date(data.dob);
      const today = new Date();
      if (isNaN(dobDate.getTime()) || dobDate >= today) {
        errors.dob = 'Date of birth must be a valid past date.';
      }
    }

    // 4. Personal Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cleanPersonalEmail = (data.personalEmail || data.email || '').toString().trim().toLowerCase();

    if (!cleanPersonalEmail) {
      errors.personalEmail = 'Personal Email address is required.';
    } else if (!emailRegex.test(cleanPersonalEmail)) {
      errors.personalEmail = 'Please provide a valid personal email format (e.g., student@gmail.com).';
    } else if (cleanPersonalEmail.endsWith('@bmu.edu.in')) {
      errors.personalEmail = 'Personal email cannot end with @bmu.edu.in! Enter your personal email (e.g. Gmail, Yahoo, Outlook). Your official @bmu.edu.in institutional email will be automatically allocated upon registration.';
    } else {
      // Check Uniqueness of Personal Email
      const duplicatePersonalEmail = students.find(s => {
        if (isUpdate && existingAdmissionNo && s.admissionNo.toUpperCase() === existingAdmissionNo.toUpperCase()) {
          return false;
        }
        return (s.personalEmail || '').toLowerCase() === cleanPersonalEmail;
      });
      if (duplicatePersonalEmail) {
        errors.personalEmail = `Personal email '${cleanPersonalEmail}' is already registered to student ${duplicatePersonalEmail.name} (${duplicatePersonalEmail.admissionNo}). Each student must provide a unique personal email.`;
      }
    }

    // 5. Student Phone validation (10 digits Indian mobile) & UNIQUENESS
    const cleanPhone = (data.phone || '').toString().trim().replace(/[\s-]/g, '');
    if (!cleanPhone) {
      errors.phone = 'Student phone number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errors.phone = 'Student phone number must be a valid 10-digit Indian number starting with 6-9.';
    } else {
      // Check Uniqueness of Student Phone Number
      const duplicatePhone = students.find(s => {
        if (isUpdate && existingAdmissionNo && s.admissionNo.toUpperCase() === existingAdmissionNo.toUpperCase()) {
          return false;
        }
        return (s.phone || '').toString().replace(/[\s-]/g, '') === cleanPhone;
      });
      if (duplicatePhone) {
        errors.phone = `Phone number '${cleanPhone}' is already registered to student ${duplicatePhone.name} (${duplicatePhone.admissionNo}). Every student must have a unique phone number.`;
      }
    }

    // 6. Parent / Guardian Details (Siblings allowed to share parent details!)
    if (data.parentPhone) {
      const cleanParentPhone = data.parentPhone.toString().trim().replace(/[\s-]/g, '');
      if (cleanParentPhone && !/^[6-9]\d{9}$/.test(cleanParentPhone)) {
        errors.parentPhone = 'Parent phone number must be a valid 10-digit Indian number starting with 6-9.';
      }
    }
    if (data.parentEmail && data.parentEmail.trim()) {
      if (!emailRegex.test(data.parentEmail.trim())) {
        errors.parentEmail = 'Parent email format is invalid.';
      }
    }

    // 7. Address
    if (!data.address || !data.address.trim()) {
      errors.address = 'Residential Address is required.';
    } else if (data.address.trim().length < 8) {
      errors.address = 'Address is too short (min 8 characters required).';
    }

    // 8. Course & Section (Section is automatically allotted on registration based on alphabetical name rule)
    if (!data.course || !data.course.trim()) {
      errors.course = 'Course / Program is required.';
    }
    if (isUpdate && (!data.section || !data.section.trim())) {
      errors.section = 'Class / Section is required.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Get all students
   */
  getAllStudents() {
    return this._getFromStorage();
  }

  /**
   * Search students by Admission Number, Name, Personal Email, or Allocated Email
   */
  search(query) {
    if (!query || !query.trim()) {
      return this.getAllStudents();
    }
    const q = query.trim().toLowerCase();
    const students = this._getFromStorage();
    return students.filter(s =>
      (s.admissionNo || '').toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.personalEmail && s.personalEmail.toLowerCase().includes(q)) ||
      (s.allocatedEmail && s.allocatedEmail.toLowerCase().includes(q)) ||
      (s.course && s.course.toLowerCase().includes(q))
    );
  }

  /**
   * Find single student by exact admission number
   */
  getByAdmissionNo(admissionNo) {
    if (!admissionNo) return null;
    const clean = admissionNo.toString().trim().toUpperCase();
    const students = this._getFromStorage();
    return students.find(s => s.admissionNo && s.admissionNo.toUpperCase() === clean) || null;
  }

  /**
   * Register a new student
   * Tests:
   * - TC1: Duplicate Admission Number Prevention
   * - Unique Student Phone Enforcement
   * - Unique Personal Email Enforcement & Rejection of @bmu.edu.in as personal mail
   * - Automated BMU Institutional Email Allocation
   * - Sibling Parent Sharing Permitted
   */
  registerStudent(studentData) {
    const students = this._getFromStorage();

    // 1. Check or Auto-Generate Admission Number (Auto-allotment if not manually provided)
    let finalAdmissionNo = '';
    if (studentData.admissionNo && studentData.admissionNo.toString().trim()) {
      const cleanAdm = studentData.admissionNo.toString().trim().toUpperCase();
      const existingAdm = students.find(s => s.admissionNo.toUpperCase() === cleanAdm);
      if (existingAdm) {
        return {
          success: false,
          errorType: 'DUPLICATE_ADMISSION_NO',
          message: `TC1 VIOLATION PREVENTED: Student record with Admission No '${cleanAdm}' already exists (${existingAdm.name}). Duplicate admission numbers are strictly rejected.`,
          existingRecord: existingAdm
        };
      }
      finalAdmissionNo = cleanAdm;
    } else {
      // Auto-allot consistent 8-character unique Admission Number
      finalAdmissionNo = this.generateAdmissionNo(studentData.course, students);
    }

    // 2. Validate data integrity
    const validation = this.validateStudent({ ...studentData, admissionNo: finalAdmissionNo }, false, null);
    if (!validation.isValid) {
      return {
        success: false,
        errorType: 'VALIDATION_FAILED',
        message: 'Registration rejected: Validation failed on one or more fields.',
        errors: validation.errors
      };
    }

    // 3. Allocate official BMU institutional email
    const allocatedEmail = this.generateAllocatedEmail(studentData.name, students);

    // 4. Hardcoded Rule: Allot Section based on alphabetical order of Student Name
    // A - F -> CSE-A, G - L -> CSE-B, M - R -> CSE-C, S - Z -> CSE-D
    const finalSection = studentData.section && studentData.section.trim()
      ? studentData.section.trim()
      : this.allotSection(studentData.name, studentData.course);

    // 5. Create fresh record
    const newStudent = {
      admissionNo: finalAdmissionNo,
      name: studentData.name.trim(),
      dob: studentData.dob,
      personalEmail: (studentData.personalEmail || studentData.email).trim().toLowerCase(),
      allocatedEmail: allocatedEmail,
      phone: studentData.phone.toString().trim().replace(/[\s-]/g, ''),
      parentName: (studentData.parentName || '').trim(),
      parentPhone: (studentData.parentPhone || '').toString().trim().replace(/[\s-]/g, ''),
      parentEmail: (studentData.parentEmail || '').trim().toLowerCase(),
      address: studentData.address.trim(),
      course: (studentData.course || 'B.Tech - Computer Science & Engineering').trim(),
      section: finalSection,
      bloodGroup: studentData.bloodGroup || 'O+',
      avatar: studentData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(studentData.name)}&backgroundColor=0f2b48,0078d4`,
      _version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    students.unshift(newStudent);
    this._saveToStorage(students);

    // Sync to MongoDB Atlas backend
    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent)
    }).catch(err => console.warn('MongoDB POST sync error:', err));

    this._broadcast({
      type: 'STUDENT_REGISTERED',
      student: newStudent,
      timestamp: Date.now()
    });

    return {
      success: true,
      message: `Student ${newStudent.name} registered successfully! Allotted Admission No: ${newStudent.admissionNo} | Allotted Section: ${newStudent.section} | Official Email: ${newStudent.allocatedEmail}`,
      student: newStudent
    };
  }

  /**
   * Update student details with Optimistic Concurrency Control (OCC)
   * Tests:
   * - TC2: Data Integrity & Atomic Rollback
   * - TC3: Concurrent Updates to Same Student
   * - Phone uniqueness & Personal Email uniqueness preservation
   */
  updateStudent(admissionNo, updatedFields, expectedVersion) {
    const students = this._getFromStorage();
    const cleanAdm = admissionNo.toString().trim().toUpperCase();
    const index = students.findIndex(s => s.admissionNo.toUpperCase() === cleanAdm);

    // Check student existence
    if (index === -1) {
      return {
        success: false,
        errorType: 'NOT_FOUND',
        message: `Student with Admission No '${cleanAdm}' does not exist.`
      };
    }

    const currentRecord = students[index];

    // TC3: Concurrency Conflict Detection (Optimistic Locking)
    if (expectedVersion !== undefined && expectedVersion !== null) {
      const clientVersion = parseInt(expectedVersion, 10);
      const serverVersion = parseInt(currentRecord._version, 10);

      if (clientVersion !== serverVersion) {
        return {
          success: false,
          errorType: 'CONCURRENCY_CONFLICT',
          message: `TC3 CONCURRENCY CONFLICT: Update blocked! This record has been modified by another user/window (Current Record Version: v${serverVersion}, Your Window Version: v${clientVersion}). Overwriting would cause silent data loss. Please reload latest details.`,
          conflictDetails: {
            clientVersion,
            serverVersion,
            currentRecord: { ...currentRecord }
          }
        };
      }
    }

    // Merge proposed fields
    const stagedRecord = {
      ...currentRecord,
      ...updatedFields,
      admissionNo: currentRecord.admissionNo, // Primary key cannot change
      allocatedEmail: currentRecord.allocatedEmail // Allocated email remains permanent
    };

    // TC2: Data Integrity & Full Validation Check BEFORE saving
    const validation = this.validateStudent(stagedRecord, true, cleanAdm);
    if (!validation.isValid) {
      // ATOMIC ROLLBACK: No change is made to localStorage!
      return {
        success: false,
        errorType: 'VALIDATION_FAILED',
        message: `TC2 DATA INTEGRITY ENFORCED: Invalid input detected in [${Object.keys(validation.errors).join(', ')}]. Transaction rolled back - NO partial updates were saved. Original data remains pristine.`,
        errors: validation.errors,
        originalRecord: { ...currentRecord }
      };
    }

    // Commit changes atomically
    stagedRecord._version = (currentRecord._version || 1) + 1;
    stagedRecord.updatedAt = new Date().toISOString();

    students[index] = stagedRecord;
    this._saveToStorage(students);

    // Sync to MongoDB Atlas backend
    fetch(`/api/students/${encodeURIComponent(cleanAdm)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedFields: stagedRecord,
        expectedVersion: expectedVersion
      })
    }).catch(err => console.warn('MongoDB PUT sync error:', err));

    this._broadcast({
      type: 'STUDENT_UPDATED',
      admissionNo: cleanAdm,
      updatedRecord: stagedRecord,
      timestamp: Date.now()
    });

    return {
      success: true,
      message: `Student details updated successfully! Record version incremented to v${stagedRecord._version}.`,
      student: stagedRecord
    };
  }

  /**
   * Delete student
   */
  deleteStudent(admissionNo) {
    let students = this._getFromStorage();
    const clean = admissionNo.toString().trim().toUpperCase();
    const existing = students.find(s => s.admissionNo.toUpperCase() === clean);
    if (!existing) {
      return { success: false, message: 'Student not found.' };
    }
    students = students.filter(s => s.admissionNo.toUpperCase() !== clean);
    this._saveToStorage(students);
    this._broadcast({ type: 'STUDENT_DELETED', admissionNo: clean });
    return { success: true, message: `Student ${clean} deleted.` };
  }
}

// Global instance
window.StudentDB = new StudentDatabase();
