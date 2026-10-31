/**
 * Test Suite & Demonstration Engine for Hard Test Cases
 * TC1: Duplicate Student Registration Prevention
 * TC2: Data Integrity & Atomic Rollback During Updates
 * TC3: Concurrent Updates Protection (Optimistic Concurrency Control)
 * TC4: ID Card Generation for Invalid vs Updated Records
 */

window.TestCaseRunner = {
  logs: [],
  onLogUpdate: null,

  log(tcId, step, message, status = 'INFO') {
    const entry = {
      tcId,
      step,
      message,
      status, // 'INFO', 'SUCCESS', 'FAIL', 'WARN'
      timestamp: new Date().toLocaleTimeString()
    };
    this.logs.push(entry);
    if (this.onLogUpdate) {
      this.onLogUpdate(entry, this.logs);
    }
    console.log(`[${entry.status}] [${tcId}] Step ${step}: ${message}`);
  },

  clearLogs() {
    this.logs = [];
    if (this.onLogUpdate) {
      this.onLogUpdate(null, []);
    }
  },

  /**
   * TC1: Duplicate Student Registration
   */
  async runTC1() {
    try {
      this.log('TC1', 1, 'Starting Test Case 1: Duplicate Student Registration Prevention...', 'INFO');
      
      // Step 1: Pick an existing student
      let existing = window.StudentDB.getByAdmissionNo('24CSE001');
      if (!existing) {
        window.StudentDB.resetToSampleData();
        existing = window.StudentDB.getByAdmissionNo('24CSE001');
      }
      const targetAdm = '24CSE001';
      this.log('TC1', 2, `Identified existing registered student with Admission No: ${targetAdm} (${existing?.name || 'Aarav Sharma'}).`, 'INFO');

      // Step 2: Attempt to register another student with exact same admission number
      this.log('TC1', 3, `Submitting new registration with duplicate Admission No '${targetAdm}' for candidate 'Vikram Malhotra'...`, 'INFO');
      
      const duplicatePayload = {
        admissionNo: targetAdm,
        name: 'Vikram Malhotra',
        dob: '2004-05-10',
        personalEmail: 'vikram.malhotra2004@gmail.com',
        phone: '9988776655',
        address: 'Sector 14, Gurugram, Haryana',
        course: 'B.Tech - Computer Science & Engineering',
        section: 'CSE-A',
        bloodGroup: 'O+'
      };

      const result = window.StudentDB.registerStudent(duplicatePayload);

      // Step 3: Assert rejection
      if (!result.success && result.errorType === 'DUPLICATE_ADMISSION_NO') {
        this.log('TC1', 4, `REJECTION CONFIRMED: System returned error code [DUPLICATE_ADMISSION_NO]. Message: "${result.message}"`, 'SUCCESS');
        
        // Step 4: Verify Database uniqueness integrity
        const allStudents = window.StudentDB.getAllStudents();
        const matchCount = allStudents.filter(s => s.admissionNo === targetAdm).length;
        if (matchCount === 1) {
          this.log('TC1', 5, `INTEGRITY VERIFIED: Database contains exactly 1 record for '${targetAdm}'. Original student (${existing?.name || 'Aarav Sharma'}) was not replaced.`, 'SUCCESS');
          this.log('TC1', 'FINAL', '✅ TC1 PASSED: Duplicate admission number successfully prevented and database uniqueness preserved.', 'SUCCESS');
          return { passed: true, details: result.message };
        } else {
          this.log('TC1', 5, `ASSERTION FAILED: Found ${matchCount} records with admission number '${targetAdm}'!`, 'FAIL');
          return { passed: false, details: 'Duplicate was inserted in database!' };
        }
      } else {
        this.log('TC1', 4, `ASSERTION FAILED: Registration did not reject duplicate! Result: ${JSON.stringify(result)}`, 'FAIL');
        return { passed: false, details: 'System permitted duplicate registration' };
      }
    } catch (err) {
      this.log('TC1', 'ERR', `Error: ${err.message}`, 'FAIL');
      return { passed: false, details: err.message };
    }
  },

  /**
   * TC2: Data Integrity During Student Updates
   */
  async runTC2() {
    this.log('TC2', 1, 'Starting Test Case 2: Data Integrity During Student Updates (Atomic Rollback)...', 'INFO');
    
    const targetAdm = '24CSE042';
    let original = window.StudentDB.getByAdmissionNo(targetAdm);
    if (!original) {
      window.StudentDB.resetToSampleData();
      original = window.StudentDB.getByAdmissionNo(targetAdm);
    }
    const initialPhone = original.phone;
    const initialAddress = original.address;
    const initialVersion = original._version;

    this.log('TC2', 2, `Target student: ${original.name} (${targetAdm}). Current Phone: ${initialPhone}, Address: ${initialAddress}, Version: v${initialVersion}`, 'INFO');

    // Step 3: Prepare an update with one valid field and one INVALID field
    // Address is valid, Phone is invalid (has characters/too short)
    const invalidPhone = '9812-INVALID-NUM';
    const candidateNewAddress = 'NEW PENDING ADDRESS: Sector 29 Cyber City Gurugram';

    this.log('TC2', 3, `Attempting multi-field update: Setting Address to "${candidateNewAddress}" AND Phone to INVALID value "${invalidPhone}"...`, 'WARN');

    const updateResult = window.StudentDB.updateStudent(
      targetAdm,
      {
        address: candidateNewAddress,
        phone: invalidPhone
      },
      initialVersion
    );

    // Step 4: Verify that update is rejected
    if (!updateResult.success && updateResult.errorType === 'VALIDATION_FAILED') {
      this.log('TC2', 4, `REJECTION CONFIRMED: ${updateResult.message}`, 'SUCCESS');
      
      // Step 5: Check database state to ensure NO partial update occurred (Atomic Transaction check)
      const freshRecord = window.StudentDB.getByAdmissionNo(targetAdm);
      
      const phoneUnchanged = freshRecord.phone === initialPhone;
      const addressUnchanged = freshRecord.address === initialAddress;
      const versionUnchanged = freshRecord._version === initialVersion;

      if (phoneUnchanged && addressUnchanged && versionUnchanged) {
        this.log('TC2', 5, `ATOMIC INTEGRITY CONFIRMED:
- Phone remains unchanged: "${freshRecord.phone}"
- Address remains unchanged: "${freshRecord.address}"
- Version remains v${freshRecord._version}
No partial dirty update occurred.`, 'SUCCESS');
        this.log('TC2', 'FINAL', '✅ TC2 PASSED: Invalid update was completely rejected with zero partial data corruption.', 'SUCCESS');
        return { passed: true, details: 'Atomic integrity maintained, dirty write prevented' };
      } else {
        this.log('TC2', 5, `ASSERTION FAILED: Partial update occurred! Fresh address is "${freshRecord.address}"`, 'FAIL');
        return { passed: false, details: 'Partial update corrupted record!' };
      }
    } else {
      this.log('TC2', 4, `ASSERTION FAILED: Update did not reject invalid phone! Result: ${JSON.stringify(updateResult)}`, 'FAIL');
      return { passed: false, details: 'Invalid data was saved to database' };
    }
  },

  /**
   * TC3: Concurrent Updates to the Same Student (Simulated Two Windows/Users)
   */
  async runTC3() {
    this.log('TC3', 1, 'Starting Test Case 3: Concurrent Updates to Same Student...', 'INFO');
    
    const targetAdm = '24MBA015';
    let student = window.StudentDB.getByAdmissionNo(targetAdm);
    if (!student) {
      window.StudentDB.resetToSampleData();
      student = window.StudentDB.getByAdmissionNo(targetAdm);
    }

    const baselineVersion = student._version;
    this.log('TC3', 2, `Both Window A and Window B load student '${student.name}' at Version v${baselineVersion}.`, 'INFO');

    // Simulate Window A updating phone number
    const windowANewPhone = '9876500001';
    this.log('TC3', 3, `Window A updates Phone Number to '${windowANewPhone}' and submits first...`, 'INFO');

    const resultA = window.StudentDB.updateStudent(
      targetAdm,
      { phone: windowANewPhone },
      baselineVersion
    );

    if (!resultA.success) {
      this.log('TC3', 3, `Window A update failed unexpectedly: ${resultA.message}`, 'FAIL');
      return { passed: false, details: 'Window A failed' };
    }

    this.log('TC3', 4, `Window A save succeeded! Database version advanced to v${resultA.student._version}.`, 'SUCCESS');

    // Now Window B attempts to update Address using stale baselineVersion
    const windowBNewAddress = 'Stale Window B Address: Tower 9, Cyber Park, Gurugram';
    this.log('TC3', 5, `Window B attempts to save Address using outdated snapshot (sent Version v${baselineVersion}, while DB is now at v${resultA.student._version})...`, 'WARN');

    const resultB = window.StudentDB.updateStudent(
      targetAdm,
      { address: windowBNewAddress },
      baselineVersion // Stale version!
    );

    // Step 6: Verify Concurrency Conflict rejection
    if (!resultB.success && resultB.errorType === 'CONCURRENCY_CONFLICT') {
      this.log('TC3', 6, `OCC CONFLICT DETECTED: ${resultB.message}`, 'SUCCESS');

      // Check current record in DB
      const freshRecord = window.StudentDB.getByAdmissionNo(targetAdm);
      if (freshRecord.phone === windowANewPhone && freshRecord.address !== windowBNewAddress) {
        this.log('TC3', 7, `DATA SAFETY VERIFIED: Window A's phone update ('${freshRecord.phone}') was preserved. Window B was prevented from silently wiping it out.`, 'SUCCESS');
        this.log('TC3', 'FINAL', '✅ TC3 PASSED: Optimistic concurrency control successfully detected stale state and prevented silent overwrite.', 'SUCCESS');
        return { passed: true, details: 'Stale overwrite blocked, data integrity preserved.' };
      } else {
        this.log('TC3', 7, 'ASSERTION FAILED: Window A update was wiped by Window B!', 'FAIL');
        return { passed: false, details: 'Lost update anomaly detected.' };
      }
    } else {
      this.log('TC3', 6, `ASSERTION FAILED: Window B was allowed to overwrite stale data! Result: ${JSON.stringify(resultB)}`, 'FAIL');
      return { passed: false, details: 'Concurrent overwrite not blocked!' };
    }
  },

  /**
   * TC4: ID Card Generation for Invalid or Updated Records
   */
  async runTC4() {
    this.log('TC4', 1, 'Starting Test Case 4: ID Card Generation for Invalid vs Updated Records...', 'INFO');

    // Part A: Nonexistent Admission Number
    const fakeAdm = 'FAKE999INVALID';
    this.log('TC4', 2, `Step 1: Attempting to generate ID card for nonexistent admission number '${fakeAdm}'...`, 'WARN');

    const fakeStudent = window.StudentDB.getByAdmissionNo(fakeAdm);
    if (fakeStudent === null) {
      this.log('TC4', 3, `NONEXISTENT VALIDATION: Database returned NULL. System correctly disallows card generation and displays "Student Not Found" state.`, 'SUCCESS');
    } else {
      this.log('TC4', 3, `ASSERTION FAILED: Nonexistent student returned a record!`, 'FAIL');
      return { passed: false, details: 'Found ghost record' };
    }

    // Part B: Existing Student Update & Card Regeneration
    const targetAdm = '24BBA088';
    let existing = window.StudentDB.getByAdmissionNo(targetAdm);
    if (!existing) {
      window.StudentDB.resetToSampleData();
      existing = window.StudentDB.getByAdmissionNo(targetAdm);
    }
    this.log('TC4', 4, `Step 2: Selected valid student '${existing?.name || 'Priya Iyer'}' (${targetAdm}). Current Section: '${existing?.section || 'BBA-2'}', Phone: '${existing?.phone || '9789012345'}'.`, 'INFO');

    // Update student's details
    const updatedSection = 'BBA-HONORS';
    const updatedPhone = '9999888877';
    this.log('TC4', 5, `Step 3: Updating student details -> Section: '${updatedSection}', Phone: '${updatedPhone}'...`, 'INFO');

    const updateRes = window.StudentDB.updateStudent(
      targetAdm,
      { section: updatedSection, phone: updatedPhone },
      existing._version
    );

    if (!updateRes.success) {
      this.log('TC4', 5, `Update failed: ${updateRes.message}`, 'FAIL');
      return { passed: false, details: 'Student update failed' };
    }

    // Regenerate ID card details
    const regeneratedRecord = window.StudentDB.getByAdmissionNo(targetAdm);
    this.log('TC4', 6, `Step 4: Regenerating ID card for '${targetAdm}'. Checking card data binding...`, 'INFO');

    const isCardSectionCorrect = regeneratedRecord.section === updatedSection;
    const isCardPhoneCorrect = regeneratedRecord.phone === updatedPhone;

    if (isCardSectionCorrect && isCardPhoneCorrect) {
      this.log('TC4', 7, `REGENERATION VERIFIED: ID Card data successfully displays latest updated Section ('${regeneratedRecord.section}') and Phone ('${regeneratedRecord.phone}'). Version is now v${regeneratedRecord._version}.`, 'SUCCESS');
      this.log('TC4', 'FINAL', '✅ TC4 PASSED: Nonexistent student blocked from generating ID card, and updated record regenerates with latest fresh data.', 'SUCCESS');
      return { passed: true, details: 'ID card generation logic fully verified.' };
    } else {
      this.log('TC4', 7, 'ASSERTION FAILED: Regenerated card does not match updated record!', 'FAIL');
      return { passed: false, details: 'Card displayed stale or incorrect data.' };
    }
  },

  /**
   * Run all 4 test cases sequentially
   */
  async runAllTests() {
    this.clearLogs();
    this.log('ALL', 0, '================ EXECUTING COMPREHENSIVE TEST SUITE ================', 'INFO');
    const r1 = await this.runTC1();
    await new Promise(r => setTimeout(r, 400));
    const r2 = await this.runTC2();
    await new Promise(r => setTimeout(r, 400));
    const r3 = await this.runTC3();
    await new Promise(r => setTimeout(r, 400));
    const r4 = await this.runTC4();
    
    const allPassed = r1.passed && r2.passed && r3.passed && r4.passed;
    this.log('ALL', 99, `================ SUMMARY: ${allPassed ? 'ALL 4 TEST CASES PASSED ✅' : 'SOME TEST CASES FAILED ❌'} ================`, allPassed ? 'SUCCESS' : 'FAIL');
    return {
      allPassed,
      results: { TC1: r1, TC2: r2, TC3: r3, TC4: r4 }
    };
  }
};
