export class DashboardQueryDTO {
  static from(query) {
    return {
      period: query.period,
      startDate: query.startDate,
      endDate: query.endDate
    };
  }
}
