import * as appointmentService from '../services/appointment.service.js';

/**
 * GET /api/v1/appointments/slots?bloodBankId=&date=
 */
export const getSlots = async (req, res, next) => {
  try {
    const { bloodBankId, date, maxPerSlot } = req.query;
    const result = await appointmentService.getAvailableSlots(
      bloodBankId,
      date,
      maxPerSlot
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/appointments
 */
export const book = async (req, res, next) => {
  try {
    const appointment = await appointmentService.bookAppointment(req.user._id, {
      bloodBankId: req.body.bloodBankId || req.body.bloodBank,
      slotDate: req.body.slotDate || req.body.appointmentDate,
      slotTime: req.body.slotTime || req.body.timeSlot,
      notes: req.body.notes,
    });

    res.status(201).json({
      success: true,
      message: 'Donation appointment successfully scheduled!',
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/appointments/:id/reschedule
 */
export const reschedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { slotDate, slotTime, reason } = req.body;

    const appointment = await appointmentService.rescheduleAppointment(
      id,
      req.user._id,
      req.user.role,
      {
        slotDate: slotDate || req.body.appointmentDate,
        slotTime: slotTime || req.body.timeSlot,
        reason,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Appointment successfully rescheduled.',
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/appointments/:id/cancel
 */
export const cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellationReason, reason } = req.body;

    const appointment = await appointmentService.cancelAppointment(
      id,
      req.user._id,
      req.user.role,
      { cancellationReason: cancellationReason || reason }
    );

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/appointments/my
 */
export const getMy = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const result = await appointmentService.getMyAppointments(req.user._id, {
      status,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/appointments/bank
 * Requires BLOOD_BANK or ADMIN role
 */
export const getBankAppointments = async (req, res, next) => {
  try {
    const { bloodBankId, date, status, page, limit } = req.query;
    const result = await appointmentService.getBankAppointments(
      req.user._id,
      req.user.role,
      { bloodBankId, date, status, page, limit }
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/appointments/:id/complete
 * Requires BLOOD_BANK or ADMIN role
 */
export const complete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { units, remarks, certificateUrl } = req.body;

    const result = await appointmentService.completeAppointment(
      id,
      req.user._id,
      req.user.role,
      { units, remarks, certificateUrl }
    );

    res.status(200).json({
      success: true,
      message: 'Appointment completed, donation recorded, and inventory updated successfully.',
      appointment: result.appointment,
      donation: result.donation,
      donorNextEligibleDate: result.donorNextEligibleDate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/appointments/:id/no-show
 * Requires BLOOD_BANK or ADMIN role
 */
export const noShow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await appointmentService.markAppointmentNoShow(
      id,
      req.user._id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Appointment marked as NO_SHOW.',
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/appointments/trigger-reminders (Admin/Cron trigger)
 */
export const triggerReminders = async (req, res, next) => {
  try {
    const result = await appointmentService.sendAppointmentReminders();
    res.status(200).json({
      success: true,
      message: '24-hour appointment reminder check executed.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
