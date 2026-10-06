import test from 'node:test';
import assert from 'node:assert/strict';
import { checkScheduleConflicts } from './scheduleConflicts.js';

const existingSchedule = {
  id: 'session-1',
  session_date: '2026-09-18',
  start_time: '18:30:00',
  end_time: '19:30:00',
  teacher_id: 'teacher-1',
  batch_id: 'batch-1',
  room_number: 'Room 101',
  batch_name: 'Batch A',
  subject: 'Mathematics',
  status: 'scheduled',
};

const overlappingSlot = {
  session_date: '2026-09-18',
  start_time: '18:45',
  end_time: '19:00',
  teacher_id: 'teacher-1',
  batch_id: 'batch-1',
  room_number: 'Room 101',
};

test('same-date overlapping slot reports teacher, batch, and room conflicts', () => {
  const conflicts = checkScheduleConflicts([existingSchedule], overlappingSlot);

  assert.equal(conflicts.length, 3);
  assert.ok(conflicts.some((conflict) => conflict.startsWith('Teacher Conflict:')));
  assert.ok(conflicts.some((conflict) => conflict.startsWith('Batch Conflict:')));
  assert.ok(conflicts.some((conflict) => conflict.startsWith('Room Conflict:')));
});

test('same weekday and time on a different date is not a conflict', () => {
  const conflicts = checkScheduleConflicts([existingSchedule], {
    ...overlappingSlot,
    session_date: '2026-10-02',
  });

  assert.deepEqual(conflicts, []);
});

test('non-overlapping times on the same date are not a conflict', () => {
  const conflicts = checkScheduleConflicts([existingSchedule], {
    ...overlappingSlot,
    start_time: '19:30',
    end_time: '20:00',
  });

  assert.deepEqual(conflicts, []);
});

test('editing the current session does not conflict with itself', () => {
  const conflicts = checkScheduleConflicts(
    [existingSchedule],
    { ...overlappingSlot, id: existingSchedule.id },
    existingSchedule.id,
  );

  assert.deepEqual(conflicts, []);
});