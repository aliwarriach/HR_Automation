import apiClient from "./apiClient";

export const scheduleInterview = (shortlistId, { interviewDate, interviewTime, candidateName }) =>
  apiClient.post(`/shortlist/${shortlistId}/interview`, {
    interview_date: interviewDate,
    interview_time: interviewTime,
    candidate_name: candidateName || null,
  });
