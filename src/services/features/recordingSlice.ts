import axiosInstance from "@/services/constant/axiosInstance";

export interface Sentence {
  SentenceID: string;
  Content: string;
  CreatedAt: string;
  Status: number;
}

export interface Recording {
  RecordingID: string;
  PersonID: string | null;
  SentenceID: string;
  AudioUrl: string | null;
  IsApproved: number | boolean | null;
  RecordedAt: string;
  Status?: number;
  Duration?: number;
  Email?: string | null;
  Content?: string | null;
}






// Generic paginated response (backend supports page & limit)
export interface PaginatedResponse<T> {
  count: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  data: T[];
  // Allow extra fields without strict typing
  [key: string]: any;
}

export interface PaginatedParams {
  page?: number;
  limit?: number;
  isApproved?: number | null; // For recordings filter
  status?: number | null; // For sentences filter
  email?: string; // For recordings search by email
}

export const getSentences = async (): Promise<Sentence[]> => {
  try {
    const response = await axiosInstance.get("sentences");
    const data = response.data;
    // Handle both direct array and nested data structure
    if (Array.isArray(data)) {
      return data;
    } else if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    console.warn("Unexpected data format from getSentences:", data);
    return [];
  } catch (error: any) {
    console.error("Error fetching sentences:", error);
    return [];
  }
};

// New helper to get sentences with pagination metadata
export const getSentencesWithMeta = async (
  params?: PaginatedParams
): Promise<PaginatedResponse<Sentence>> => {
  try {
    const requestParams: any = {
      page: params?.page,
      limit: params?.limit,
    };
    // Only add status param if it's not null/undefined
    if (params?.status !== null && params?.status !== undefined) {
      requestParams.status = params.status;
    }
    const response = await axiosInstance.get("sentences", {
      params: requestParams,
    });
    const data = response.data;

    // If backend already returns the paginated shape
    if (data && Array.isArray(data.data)) {
      return {
        count: data.count ?? data.data.length,
        totalCount: data.totalCount ?? data.count ?? data.data.length,
        totalPages: data.totalPages ?? 1,
        currentPage: data.currentPage ?? params?.page ?? 1,
        data: data.data,
        ...data,
      };
    }

    // If backend returns raw array, wrap it
    if (Array.isArray(data)) {
      return {
        count: data.length,
        totalCount: data.length,
        totalPages: 1,
        currentPage: params?.page ?? 1,
        data,
      };
    }

    console.warn("Unexpected data format from getSentencesWithMeta:", data);
    return {
      count: 0,
      totalCount: 0,
      totalPages: 0,
      currentPage: params?.page ?? 1,
      data: [],
    };
  } catch (error: any) {
    console.error("Error fetching sentences with meta:", error);
    return {
      count: 0,
      totalCount: 0,
      totalPages: 0,
      currentPage: params?.page ?? 1,
      data: [],
    };
  }
};

export const getRecordings = async (): Promise<Recording[]> => {
  try {
    const response = await axiosInstance.get("recordings");
    const data = response.data;
    // Handle both direct array and nested data structure
    if (Array.isArray(data)) {
      return data;
    } else if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    console.warn("Unexpected data format from getRecordings:", data);
    return [];
  } catch (error: any) {
    console.error("Error fetching recordings:", error);
    return [];
  }
};

// New helper to get recordings with pagination metadata
export const getRecordingsWithMeta = async (
  params?: PaginatedParams
): Promise<PaginatedResponse<Recording>> => {
  try {
    const requestParams: any = {
      page: params?.page,
      limit: params?.limit,
    };
    // Only add isApproved param if it's not null/undefined
    if (params?.isApproved !== null && params?.isApproved !== undefined) {
      requestParams.isApproved = params.isApproved;
    }
    // Add email param if provided
    if (params?.email && params.email.trim() !== '') {
      requestParams.email = params.email.trim();
    }
    const response = await axiosInstance.get("recordings", {
      params: requestParams,
    });
    const data = response.data;

    if (data && Array.isArray(data.data)) {
      return {
        count: data.count ?? data.data.length,
        totalCount: data.totalCount ?? data.count ?? data.data.length,
        totalPages: data.totalPages ?? 1,
        currentPage: data.currentPage ?? params?.page ?? 1,
        data: data.data,
        ...data,
      };
    }

    if (Array.isArray(data)) {
      return {
        count: data.length,
        totalCount: data.length,
        totalPages: 1,
        currentPage: params?.page ?? 1,
        data,
      };
    }

    console.warn("Unexpected data format from getRecordingsWithMeta:", data);
    return {
      count: 0,
      totalCount: 0,
      totalPages: 0,
      currentPage: params?.page ?? 1,
      data: [],
    };
  } catch (error: any) {
    console.error("Error fetching recordings with meta:", error);
    return {
      count: 0,
      totalCount: 0,
      totalPages: 0,
      currentPage: params?.page ?? 1,
      data: [],
    };
  }
};

export const getRecordingsByPersonId = async (
  personId: string
): Promise<Recording[]> => {
  try {
    const allRecordings = await getRecordings();
    // Filter recordings by PersonID
    return allRecordings.filter((recording) => recording.PersonID === personId);
  } catch (error: any) {
    console.error("Error fetching recordings by personId:", error);
    return [];
  }
};

export const getRecordingsByStatus = async (
  status: number
): Promise<Recording[]> => {
  try {
    const response = await axiosInstance.get<{
      isApproved: number;
      count: number;
      data: Recording[];
    }>(`recordings/status/${status}`);
    return Array.isArray(response.data.data) ? response.data.data : [];
  } catch (error: any) {
    console.error("Error fetching recordings by status:", error);
    return [];
  }
};

export interface UploadRecordingResponse {
  success: boolean;
  message: string;
  data: {
    personId: string;
    sentenceId: string;
    audioUrl: string;
    isApproved: boolean;
    recordedAt: string;
    _id: string;
    __v: number;
  };
}

export const uploadRecording = async (
  audioBlob: Blob,
  personId: string,
  sentenceId: string
): Promise<UploadRecordingResponse> => {
  try {
    const formData = new FormData();
    
    // Determine file extension based on blob type
    let fileName = "recording.webm";
    let mimeType = audioBlob.type || "audio/webm";
    
    if (mimeType.includes("wav")) {
      fileName = "recording.wav";
    } else if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
      fileName = "recording.m4a";
    } else if (mimeType.includes("aac")) {
      fileName = "recording.aac";
    } else if (mimeType.includes("ogg")) {
      fileName = "recording.ogg";
    } else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
      fileName = "recording.mp3";
    }
    
    formData.append("audio", audioBlob, fileName);
    formData.append("personId", personId);
    formData.append("sentenceId", sentenceId);

    const response = await axiosInstance.post<UploadRecordingResponse>(
      "recordings",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Upload failed" };
  }
};

// CRUD operations for Sentences
export const createSentence = async (content: string): Promise<Sentence> => {
  try {
    const response = await axiosInstance.post<Sentence>("sentences", {
      content,
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Create sentence failed" };
  }
};

export const updateSentence = async (
  sentenceId: string,
  content: string
): Promise<Sentence> => {
  try {
    const response = await axiosInstance.put<Sentence>(
      `sentences/${sentenceId}`,
      { content }
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Update sentence failed" };
  }
};

export const deleteSentence = async (sentenceId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`sentences/${sentenceId}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Delete sentence failed" };
  }
};

// Approve/Reject Sentence
export const approveSentence = async (
  sentenceId: string
): Promise<Sentence> => {
  try {
    const response = await axiosInstance.patch<Sentence>(
      `sentences/${sentenceId}/approve`
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Approve sentence failed" };
  }
};

export const rejectSentence = async (sentenceId: string): Promise<Sentence> => {
  try {
    const response = await axiosInstance.patch<Sentence>(
      `sentences/${sentenceId}/reject`
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Reject sentence failed" };
  }
};

// Approve/Reject Recording
export const approveRecording = async (
  recordingId: string
): Promise<Recording> => {
  try {
    const response = await axiosInstance.patch<Recording>(
      `recordings/${recordingId}/approve`
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Approve recording failed" };
  }
};

export const rejectRecording = async (
  recordingId: string
): Promise<Recording> => {
  try {
    const response = await axiosInstance.patch<Recording>(
      `recordings/${recordingId}/reject`
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Reject recording failed" };
  }
};

// Delete Recording
export const deleteRecording = async (recordingId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`recordings/${recordingId}`);
  } catch (error: any) {
    throw error.response?.data || { message: "Delete recording failed" };
  }
};

// Create user sentence
export interface CreateUserSentenceRequest {
  email: string;
  content: string;
}

export interface CreateUserSentenceResponse {
  message: string;
  data: Array<{
    content: string;
    status: number;
    _id: string;
    __v: number;
    createdAt: string;
  }>;
}

export const createUserSentence = async (
  request: CreateUserSentenceRequest
): Promise<CreateUserSentenceResponse> => {
  try {
    const response = await axiosInstance.post<CreateUserSentenceResponse>(
      "sentences/user",
      request
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Create user sentence failed" };
  }
};
// Download sentences with audio
export interface DownloadSentencesParams {
  mode?: "with-audio" | "without-audio" | "all" | "approved";
  status?: number;
  limit?: number;
}

export const downloadSentences = async (
  params?: DownloadSentencesParams
): Promise<Blob> => {
  try {
    const response = await axiosInstance.get<Blob>("sentences/download", {
      params: {
        mode: params?.mode || "with-audio",
        status: params?.status,
        limit: params?.limit,
      },
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Download sentences failed" };
  }
};

// Download recordings by emails and date range
export interface DownloadRecordingsParams {
  emails: string[];
  dateFrom?: string;
  dateTo?: string;
  isApproved?: number;
}

export const downloadRecordings = async (
  params: DownloadRecordingsParams
): Promise<Blob> => {
  try {
    const response = await axiosInstance.get<Blob>("recordings/download", {
      params: {
        emails: params.emails.join(','),
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        isApproved: params.isApproved ?? 1,
      },
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Download recordings failed" };
  }
};

// Get top recorders
export interface TopRecorder {
  userId: string;
  email: string;
  gender: string;
  totalRecordings: number;
  approvedRecordings?: number;
  pendingRecordings?: number;
  rejectedRecordings?: number;
  createdAt: string;
}

export interface TopRecordersResponse {
  filter: {
    status: number | null;
    limit: number;
  };
  count: number;
  data: TopRecorder[];
}

export interface TopRecordersParams {
  status?: number;
  limit?: number;
}

export const getTopRecorders = async (
  params?: TopRecordersParams
): Promise<TopRecorder[]> => {
  try {
    const response = await axiosInstance.get<TopRecordersResponse>(
      "users/top-recorders",
      {
        params: {
          status: params?.status,
          limit: params?.limit || 6,
        },
      }
    );
    return response.data.data || [];
  } catch (error: any) {
    console.error("Error fetching top recorders:", error);
    return [];
  }
};
