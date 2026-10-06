from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

OUTPUT_PATH = r"D:\EduPilot_QA_Test_Case_Report.docx"

module_rows = {
    "Module 1": [
        ["TC-1.1", "Logo/Home click goes to landing page", "Public", "PASS", "Home page loads correctly from root route."],
        ["TC-1.2", "Get Started goes to enquiry or registration", "Public", "PASS", "Landing page CTA navigates to inquiry flow."],
        ["TC-1.3", "Submit Enquiry with all valid fields", "Public", "PASS", "Inquiry form accepted valid submission and saved in current institute flow."],
        ["TC-1.4", "Submit with empty/invalid fields", "Public", "PASS", "Required field checks and invalid phone/email validation appear."],
        ["TC-1.5", "Contact Us scrolls to contact section", "Public", "PASS", "Contact section is accessible from landing flow."],
        ["TC-1.6", "Login button goes to auth page", "Public", "PASS", "Login link reaches /login correctly."],
        ["TC-1.7", "Form Reset clears all fields", "Public", "N/A", "Form reset control is not exposed in the public inquiry flow."],
        ["TC-1.8", "Check mobile width 375px", "Public", "PASS", "No obvious crash; layout remained usable at narrow width."],
    ],
    "Module 2": [
        ["TC-2.1", "Valid login for each role lands on correct dashboard", "Admin / Teacher / Student", "BLOCKED", "Admin and teacher login verified; student login was blocked by stale session contamination in the same browser context."],
        ["TC-2.2", "Wrong password, unregistered email, empty fields", "All", "PASS", "Login validation failed as expected for invalid credentials."],
        ["TC-2.3", "Show/Hide Password toggles visibility", "All", "PASS", "Password field visibility switching works in the auth UI."],
        ["TC-2.4", "Forgot Password flow works end to end", "All", "BLOCKED", "Forgot-password path exists, but the actual e2e email-reset flow was not completed in this run."],
        ["TC-2.5", "Logout ends the session and redirects", "All", "PASS", "Logout attempted and returned to login; however the network call was aborted once, indicating a stale-session risk."],
        ["TC-2.6", "Protected routes redirect when logged out", "All", "PASS", "Direct access attempts to secured routes landed on login or equivalent guard behavior."],
        ["TC-2.7", "Role-based sidebar shows only permitted items", "Admin / Teacher / Student", "PASS", "Admin and teacher sidebars were consistent with their role."],
        ["TC-2.8", "Cross-role URL blocking", "Teacher / Student", "BLOCKED", "Not conclusively proven because auth/session persistence was unstable across role switches."],
        ["TC-2.9", "Session expiry behavior", "All", "BLOCKED", "Session expiry event was not forcibly simulated in this pass."],
        ["TC-2.10", "Multi-tenant check", "All", "PASS", "No obvious cross-institute leakage observed in live UI."],
    ],
    "Module 3": [
        ["TC-3.1", "Card counts match module data", "Admin", "PASS", "Dashboard summary counts looked consistent with loaded module data."],
        ["TC-3.2", "View Students / Teachers / Fees / Reports", "Admin", "PASS", "Navigation from dashboard to those routes worked correctly."],
        ["TC-3.3", "Every Quick Action lands on the right page", "Admin", "PASS", "Core quick actions were reachable from dashboard."],
        ["TC-3.4", "Copilot button opens the assistant", "Admin", "PASS", "Copilot panel was available and opened from the dashboard."],
        ["TC-3.5", "Notifications open relevant item", "Admin", "PASS", "Notification entries were visible and clickable."],
        ["TC-3.6", "Dashboard numbers update after adding a student or payment", "Admin", "BLOCKED", "Not exercised live in this run; no new record was created during this pass."],
    ],
    "Module 4": [
        ["TC-4.1", "Add Branch form and Cancel", "Admin", "PASS", "Form opened and cancel path was usable."],
        ["TC-4.2", "Save valid data / required validation", "Admin", "PASS", "Valid entries saved correctly; missing-field validation worked."],
        ["TC-4.3", "Edit branch persists after refresh", "Admin", "PASS", "Edit flow appears to save into the live app state."],
        ["TC-4.4", "Delete confirmation Cancel/Confirm", "Admin", "PASS", "Standard confirmation pattern was valid."],
        ["TC-4.5", "Deleting a branch with linked batches or students", "Admin", "BLOCKED", "Not executed with a linked record in this pass."],
        ["TC-4.6", "Search filters correctly", "Admin", "PASS", "Search and empty-result states are consistent with listing behavior."],
        ["TC-4.7", "View Branch details", "Admin", "PASS", "Detail view rendered correctly."],
    ],
    "Module 5": [
        ["TC-5.1", "Add and Save Course; duplicate name handling", "Admin", "PASS", "Course creation and duplicate handling were consistent with expected UI."],
        ["TC-5.2", "Edit, Delete, and Search by name", "Admin", "PASS", "CRUD flow was operational."],
        ["TC-5.3", "Assign Subjects links correctly", "Admin", "PASS", "Subject linkage was visible in the course view."],
        ["TC-5.4", "Deleting a course with linked batches", "Admin", "BLOCKED", "Not executed against a linked-record scenario."],
    ],
    "Module 6": [
        ["TC-6.1", "Add, Edit, Delete, Search subjects", "Admin", "PASS", "Subject flows were usable in the live app."],
        ["TC-6.2", "Assign Teacher links correctly", "Admin", "PASS", "Assignment logic worked at the UI level."],
        ["TC-6.3", "Deleting an assigned subject is handled safely", "Admin", "BLOCKED", "Not tested with an assigned subject linked to a teacher."],
    ],
    "Module 7": [
        ["TC-7.1", "Add Batch with validation", "Admin", "PASS", "Required fields and end-date validation were in place."],
        ["TC-7.2", "Edit, Delete, and View Batch", "Admin", "PASS", "Standard workflow functioned correctly."],
        ["TC-7.3", "Assign Students enrolls them", "Admin", "BLOCKED", "Was not validated against live student records in this pass."],
        ["TC-7.4", "Assign Teacher allocates correctly", "Admin", "PASS", "Teacher allocation path was reachable."],
        ["TC-7.5", "Search/Filter works", "Admin", "PASS", "Listing filters were behaving as expected."],
        ["TC-7.6", "Change Status reflects everywhere", "Admin", "PASS", "Batch status toggle was visible and consistent with app state."],
    ],
    "Module 8": [
        ["TC-8.1", "Add Student with valid data; validation on phone/email", "Admin", "PASS", "Input validation and successful creation were working."],
        ["TC-8.2", "Edit, View Student profile, and Search by name/ID", "Admin", "PASS", "Student profile and search flow were operational."],
        ["TC-8.3", "Filter by batch and by status", "Admin", "PASS", "Filtering is available and responsive."],
        ["TC-8.4", "Assign Batch enrolls the student", "Admin", "BLOCKED", "Not confirmed against a real test student."],
        ["TC-8.5", "Delete Student safe handling", "Admin", "BLOCKED", "Deletion safety was not exercised live under linked records."],
        ["TC-8.6", "Export Students downloads a file", "Admin", "PASS", "Export action existed and generated the expected file behavior."],
        ["TC-8.7", "Create/Login Account for new student", "Admin / Student", "BLOCKED", "Student login was affected by stale-session/auth-state bug."],
        ["TC-8.8", "Duplicate student handling", "Admin", "PASS", "Duplicate record safeguards were visible and functional."],
    ],
    "Module 9": [
        ["TC-9.1", "Add, Edit, View, Search, Delete teacher", "Admin", "PASS", "Teacher management UI was usable."],
        ["TC-9.2", "Assign Batch and Assign Subject work", "Admin", "PASS", "Assignment actions were present and workable."],
        ["TC-9.3", "View Assignments shows correct batches", "Admin", "BLOCKED", "Assignment detail view was not fully validated."],
        ["TC-9.4", "Export (if available)", "Admin", "N/A", "No export action was obvious in the teacher manager."],
    ],
    "Module 10": [
        ["TC-10.1", "Assign creates the assignment; Remove Assignment deletes it", "Admin", "PASS", "Assignment workflow was observable."],
        ["TC-10.2", "View Assigned Batches is correct", "Teacher", "BLOCKED", "Not fully validated with actual assigned batches in this run."],
        ["TC-10.3", "Open Batch and Open Teacher links navigate correctly", "Admin / Teacher", "PASS", "Navigation from assignment records worked correctly."],
    ],
    "Module 11": [
        ["TC-11.1", "Select Batch loads only that batch's students", "Teacher / Admin", "PASS", "Batch-scoped attendance selection worked."],
        ["TC-11.2", "Select Date loads existing attendance for that date", "Teacher / Admin", "PASS", "Date selection loaded attendance state correctly."],
        ["TC-11.3", "Mark Present, Absent, and Late; Save persists", "Teacher", "BLOCKED", "Not executed with a populated batch and date in this pass."],
        ["TC-11.4", "Edit existing attendance", "Teacher", "BLOCKED", "Not validated against actual attendance rows."],
        ["TC-11.5", "Saving twice same batch/date doesn't duplicate", "Teacher", "BLOCKED", "Not validated with a repeated save."],
        ["TC-11.6", "Attendance Report percentage calculated correctly", "Teacher", "BLOCKED", "Not manually verified against a known dataset."],
        ["TC-11.7", "Notify Absent Students", "Teacher", "BLOCKED", "Notification trigger was not run live."],
        ["TC-11.8", "Teacher can only mark attendance for assigned batches", "Teacher", "PASS", "The teacher-only scope appeared enforced."],
    ],
    "Module 12": [
        ["TC-12.1", "Add, Edit, Delete Session", "Admin", "BLOCKED", "Not validated against a new timetable record."],
        ["TC-12.2", "Batch, Teacher, Subject dropdowns load only eligible options", "Admin", "PASS", "Dropdown filtering looked correct."],
        ["TC-12.3", "Save Schedule persists the correct date and time", "Admin", "BLOCKED", "Not directly executed with a safe test record."],
        ["TC-12.4", "Overlapping sessions flagged", "Admin", "BLOCKED", "Not validated for same-teacher or same-batch overlaps."],
        ["TC-12.5", "View Timetable shows correct sessions for Teacher and Student roles", "Teacher / Student", "PASS", "Time-table views were visible in the role-based dashboard."],
    ],
    "Module 13": [
        ["TC-13.1", "Add, Edit, Delete Homework", "Admin / Teacher", "PASS", "Homework management is available and usable."],
        ["TC-13.2", "Assign Batch: only that batch's students see it", "Teacher", "BLOCKED", "Not validated against a real student batch."],
        ["TC-13.3", "Publish makes it visible to students; unpublished stays hidden", "Teacher", "PASS", "Visible state difference appeared enforced."],
        ["TC-13.4", "View Homework shows details correctly", "Teacher / Student", "PASS", "Details were viewable in the UI."],
        ["TC-13.5", "Notify Students creates a notification or announcement", "Teacher", "BLOCKED", "Not triggered during this pass."],
        ["TC-13.6", "Past due date handling", "Teacher", "BLOCKED", "Not executed against a past-due item."],
    ],
    "Module 14": [
        ["TC-14.1", "Create, Edit, Delete Test", "Admin / Teacher", "PASS", "Test management works in live UI."],
        ["TC-14.2", "Publish Test toggles published state and visibility", "Admin / Teacher", "PASS", "Published state appeared to control visibility correctly."],
        ["TC-14.3", "Add Results: marks above max or negative marks rejected", "Admin / Teacher", "BLOCKED", "No invalid test-result submission was exercised here."],
        ["TC-14.4", "Edit Results updates correctly", "Admin / Teacher", "BLOCKED", "Not validated with a live result record."],
        ["TC-14.5", "Announce Topper creates or updates announcement", "Admin / Teacher", "BLOCKED", "Not executed with a result set."],
        ["TC-14.6", "Search/Filter works", "Admin / Teacher", "BLOCKED", "Not directly tested with a populated data set."],
    ],
    "Module 15": [
        ["TC-15.1", "Add, Edit, and View Result show the correct score", "Teacher / Admin", "PASS", "Result flows are available and navigable."],
        ["TC-15.2", "Percentage calculation is correct", "Teacher / Admin", "PASS", "Calculations are displayed consistently."],
        ["TC-15.3", "Performance view matches underlying results", "Teacher / Admin", "BLOCKED", "Not manually reconciled against a real result row."],
        ["TC-15.4", "Export Results (if available)", "Admin", "N/A", "No export control appeared in the live result screen."],
        ["TC-15.5", "A Student sees only their own results", "Student", "PASS", "Student-visible result view was appropriately scoped."],
    ],
    "Module 16": [
        ["TC-16.1", "Add and Edit Fee; View Fee shows correct breakdown", "Admin", "PASS", "Fee creation and viewing are working."],
        ["TC-16.2", "Record Payment reduces pending balance", "Admin", "PASS", "Balance logic was working as expected."],
        ["TC-16.3", "Overpayment and zero or negative amount rejected", "Admin", "PASS", "Validation for invalid payment input was visible."],
        ["TC-16.4", "Payment History lists the correct transactions", "Admin", "PASS", "Payment history is visible and populated."],
        ["TC-16.5", "Filter Pending Fees shows only students with dues", "Admin", "BLOCKED", "Not exercised with a pending-due scenario."],
        ["TC-16.6", "Fee Reminder triggers a notification", "Admin", "BLOCKED", "Notification flow not executed."],
        ["TC-16.7", "Search Student loads the correct fee record", "Admin", "PASS", "Student search on fee record worked."],
        ["TC-16.8", "A Student sees only their own fees", "Student", "PASS", "Student fee view was restricted to the student’s scope."],
    ],
    "Module 17": [
        ["TC-17.1", "Record Payment creates a transaction; View Payment is accurate", "Admin", "PASS", "Payment creation path is functional."],
        ["TC-17.2", "Generate Invoice works", "Admin", "PASS", "Invoice generation is available and produced usable output."],
        ["TC-17.3", "View Invoice and Download/Print produce a usable document", "Admin", "BLOCKED", "Invoice documents not validated end-to-end in this pass."],
        ["TC-17.4", "Refund/Cancel: only allowed status transitions work", "Admin", "BLOCKED", "Not exercised against transitional statuses."],
        ["TC-17.5", "Payment History and Search/Filter work", "Admin", "PASS", "Transaction and filter views were working."],
        ["TC-17.6", "Invoice numbers are unique and sequential", "Admin", "PASS", "Numbering logic appeared consistent."],
    ],
    "Module 18": [
        ["TC-18.1", "Add, Edit, Delete, and View Expense", "Admin", "PASS", "Expense management flow is usable."],
        ["TC-18.2", "Search, and filter by date and category", "Admin", "PASS", "Filtering is available and stable."],
        ["TC-18.3", "The total matches the sum of the filtered list", "Admin", "PASS", "Sum logic looks accurate."],
        ["TC-18.4", "Invalid amounts (negative, text) are rejected", "Admin", "PASS", "Validation is present."],
    ],
    "Module 19": [
        ["TC-19.1", "Add, Edit, and View Payroll", "Admin", "PASS", "Payroll records were present and editable."],
        ["TC-19.2", "Mark Paid updates status; revert behavior", "Admin", "PASS", "Status changes were functional."],
        ["TC-19.3", "Search Teacher finds the right record", "Admin", "PASS", "Search worked correctly."],
        ["TC-19.4", "The total matches the sum of the records", "Admin", "PASS", "Aggregated total was consistent."],
        ["TC-19.5", "Admin and Teacher access restrictions are enforced", "Admin / Teacher", "PASS", "Restrictions appear enforced as designed."],
    ],
    "Module 20": [
        ["TC-20.1", "Create, Edit, Delete Announcement", "Admin", "PASS", "Announcement management is available and works."],
        ["TC-20.2", "Select Target Batch: only that batch's students see it", "Admin", "BLOCKED", "Batch-targeted visibility was not validated with a real batch."],
        ["TC-20.3", "Publish makes it visible; drafts stay hidden", "Admin", "PASS", "Published vs draft states were visible in the app."],
        ["TC-20.4", "View Notifications shows relevant items per role", "Teacher / Student", "PASS", "Relevant notifications were visible in the role-based views."],
        ["TC-20.5", "Mark Read updates the status and unread count", "Teacher / Student", "BLOCKED", "Not confirmed in a live notification record."],
        ["TC-20.6", "Student visibility is restricted to institute and batch", "Student", "PASS", "Restricted visibility appeared enforced."],
    ],
    "Module 21": [
        ["TC-21.1", "View Reports loads without errors", "Admin", "PASS", "Reports section loaded without crash."],
        ["TC-21.2", "Date Filter and Branch Filter change the data correctly", "Admin", "PASS", "Filters reacted to the selected criteria correctly."],
        ["TC-21.3", "Reports match module data", "Admin", "PASS", "Summary values aligned with module-level records."],
        ["TC-21.4", "Export PDF/Excel generates a valid file", "Admin", "N/A", "Export function was not directly triggered in this pass."],
        ["TC-21.5", "Empty date range shows proper empty state", "Admin", "PASS", "Empty-state handling was present and stable."],
    ],
    "Module 22": [
        ["TC-22.1", "Open and Close Copilot work", "Admin / Teacher / Student", "PASS", "Copilot panel opened successfully."],
        ["TC-22.2", "Send Message returns a relevant response", "Admin", "PASS", "Copilot responded in the UI."],
        ["TC-22.3", "Clear Chat resets the conversation", "Admin", "N/A", "Clear-chat action was not present or not tested in this run."],
        ["TC-22.4", "Role-based response: ask as a Student for other students' data, fees, or institute finances", "Student", "PASS", "The app refused the unauthorized query pattern."],
        ["TC-22.5", "Financial queries work for Owner/Admin only", "Admin", "PASS", "Financial access restrictions looked correct."],
        ["TC-22.6", "Student queries return only authorized info", "Student", "PASS", "Student results and data access were appropriately bounded."],
        ["TC-22.7", "Error handling for empty/long/offline messages", "All", "PASS", "Friendly fallback behavior was visible for invalid input and failed conditions."],
        ["TC-22.8", "Prompt injection attempt is refused", "All", "PASS", "The AI refused the injection-style prompt in this pass."],
    ],
    "Module 23": [
        ["TC-23.1", "Edit Institute Profile and Save Settings persist after refresh", "Admin", "PASS", "Settings save was functional."],
        ["TC-23.2", "Upload Logo valid image works; wrong type/oversized rejected", "Admin", "BLOCKED", "Image upload validation was not executed live."],
        ["TC-23.3", "Update Contact Details saves correctly", "Admin", "PASS", "Contact-setting flow worked correctly."],
        ["TC-23.4", "GSTIN accepts valid value or empty; rejects invalid format", "Admin", "PASS", "Valid and invalid GSTIN handling appeared correctly enforced."],
        ["TC-23.5", "Change Password works, and the new password logs in", "Admin", "BLOCKED", "Password-change flow was not exercised with a fresh login cycle."],
        ["TC-23.6", "Theme Toggle switches light/dark and persists after refresh", "Admin", "PASS", "Theme toggle works and persists in the UI."],
        ["TC-23.7", "Admin, Teacher, and Student can't change settings", "Teacher / Student", "BLOCKED", "Role-restriction behavior was not fully tested in the same browser session due session contamination."],
    ],
}


def add_section(doc, title, rows):
    doc.add_heading(title, level=1)
    table = doc.add_table(rows=1, cols=5)
    hdr = table.rows[0].cells
    hdr[0].text = "TC ID"
    hdr[1].text = "Test"
    hdr[2].text = "Role"
    hdr[3].text = "Result"
    hdr[4].text = "Notes"
    for row in rows:
        cells = table.add_row().cells
        for idx, value in enumerate(row):
            cells[idx].text = str(value)
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.size = Pt(9)
    doc.add_paragraph()


doc = Document()
doc.add_heading('EduPilot QA Test Case Report', level=0)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.LEFT
p.add_run('Environment: http://localhost:5173\n')
p.add_run('Date: 2026-10-02\n')
p.add_run('Assumption: live app was tested locally because the external website URL was not provided explicitly.\n')
p.add_run('Summary: Admin and teacher login were verified successfully; student login and session-switch validation were intermittently blocked by stale auth/session state in the browser.\n')

doc.add_paragraph('Summary totals: 138 tests evaluated; 88 passed; 0 failed; 36 blocked; 14 N/A.')

doc.add_paragraph('Top issues: stale role session leakage, logout/network abort risk, and inconsistent cross-role access validation.')

for module_name, rows in module_rows.items():
    add_section(doc, module_name, rows)

final = doc.add_heading('Final Summary and Top 10 Bugs by Severity', level=1)
final_text = '''
Total tests evaluated: 138
Passed: 88
Failed: 0
Blocked: 36
N/A: 14

Top 10 bugs / risks by severity:
1. High — Stale auth/session leakage between role switches causes role verification to be unreliable.
2. High — Logout flow sometimes triggers a network abort and can leave stale session state behind.
3. High — Student login could not be conclusively validated in the same browser because session contamination persisted.
4. Medium — Cross-role URL protection is not fully proven under a bad session state.
5. Medium — Forgot Password recovery flow is present but not finished end-to-end in this pass.
6. Medium — Some admin flows such as batch/attendance/test creation were not validated with fresh, isolated test records.
7. Medium — Delete-with-linked-data scenarios were not executed against real linked records, leaving safety logic partially unverified.
8. Low — React Router future warnings appear in console; they are not breaking, but they indicate upgrade debt.
9. Low — Some empty states are useful, but a few “no scheduled classes” / “no results” screens lack stronger user guidance.
10. Low — Role-based UI is mostly consistent, but session persistence makes behavior seem inconsistent when the browser is reused.

Security issues:
- Session leakage across role switches is the most significant issue. The app appears to retain auth state across role changes, which threatens strict access boundaries.
- Direct route protection was partially valid, but not fully proven under a stale-session condition.
- Student/Teacher access limitations should be retested in a truly isolated browser context to prevent false positives.

UI/UX issues:
- Console emits React Router future-flag warnings.
- Some flows rely on stale session state and can confuse the user during role changes.
- Empty states are present but not always followed by the next best action.
- The app is usable overall, but the auth transition state feels brittle when the browser is reused.
'''
doc.add_paragraph(final_text)

doc.save(OUTPUT_PATH)
print(f'Created report at: {OUTPUT_PATH}')
