/**
 * Check whether a schedule slot conflicts with existing schedules.
 * Excludes the current session while it is being edited.
 */
export function checkScheduleConflicts(existingSchedules, newSlot, currentSessionId = null) {
  const conflicts = [];
  const newSessionDate = String(newSlot.session_date || newSlot.date || '').slice(0, 10);
  const newStart = String(newSlot.start_time || '').slice(0, 5);
  const newEnd = String(newSlot.end_time || '').slice(0, 5);

  for (const schedule of existingSchedules) {
    if (schedule.status === 'cancelled') continue;
    if (currentSessionId && String(schedule.id) === String(currentSessionId)) continue;
    if (newSlot.id && String(schedule.id) === String(newSlot.id)) continue;

    const existingSessionDate = String(schedule.session_date || schedule.date || '').slice(0, 10);
    if (!newSessionDate || existingSessionDate !== newSessionDate) continue;

    const existingStart = String(schedule.start_time || '').slice(0, 5);
    const existingEnd = String(schedule.end_time || '').slice(0, 5);
    const isOverlapping = newStart < existingEnd && newEnd > existingStart;

    if (!isOverlapping) continue;

    if (schedule.teacher_id && newSlot.teacher_id && String(schedule.teacher_id) === String(newSlot.teacher_id)) {
      conflicts.push(`Teacher Conflict: ${schedule.teacher_name || 'Selected Faculty'} is already scheduled for ${schedule.batch_name || 'another batch'} at ${schedule.start_time}-${schedule.end_time}.`);
    }
    if (schedule.room_number && newSlot.room_number && schedule.room_number.toLowerCase() === newSlot.room_number.toLowerCase()) {
      conflicts.push(`Room Conflict: ${schedule.room_number} is already occupied by ${schedule.batch_name || 'another class'} at ${schedule.start_time}-${schedule.end_time}.`);
    }
    if (schedule.batch_id && newSlot.batch_id && String(schedule.batch_id) === String(newSlot.batch_id)) {
      conflicts.push(`Batch Conflict: ${schedule.batch_name || 'This batch'} already has a class scheduled (${schedule.subject || 'Subject'}) at ${schedule.start_time}-${schedule.end_time}.`);
    }
  }

  return conflicts;
}