export class FeedbackRequestDTO {
  static fromComment(body) {
    return {
      content: body.content,
      ...(body.parentCommentId !== undefined && {parentCommentId: body.parentCommentId}),
      ...(body.guestName !== undefined && {guestName: body.guestName}),
      ...(body.guestEmail !== undefined && {guestEmail: body.guestEmail})
    };
  }

  static fromRating(body) {
    return {stars: body.stars};
  }

  static fromReaction(body) {
    return {reaction: body.reaction};
  }
}
