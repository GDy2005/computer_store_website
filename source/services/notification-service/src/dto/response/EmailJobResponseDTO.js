export class EmailJobResponseDTO {
  static from(value) {
    if (!value) return null;

    return {
      id: value._id?.toString?.() || value.id,
      eventId: value.eventId,
      recipientEmail: value.recipientEmail,
      template: value.template,
      status: value.status,
      attempts: value.attempts,
      nextAttemptAt: value.nextAttemptAt,
      sentAt: value.sentAt,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt
    };
  }
}
