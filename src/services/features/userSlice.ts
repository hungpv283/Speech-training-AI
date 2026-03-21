import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "@/services/constant/axiosInstance";

export interface UserInfo {
  email: string;
  gender: "male" | "female";
  userId?: string;
}

export interface Recording {
  sentence: string;
  sentenceId?: string;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
}

export interface User {
  PersonID: string;
  Email: string;
  Gender: string;
  Role?: string;
  CreatedAt: string;
  SentencesDone?: Array<{
    SentenceID: string;
    Content: string;
    AudioUrl?: string;
    Duration?: number;
    RecordedAt?: string;
  }>;
  TotalRecordingDuration?: number;
  TotalSentencesDone?: number;
  /** Số câu ghi âm đã được duyệt */
  ApprovedRecordingsCount?: number;
  /** Tổng thời gian (giây) của các câu đã duyệt */
  TotalApprovedRecordingDuration?: number;
  TotalContributedByUser?: number;
  CreatedSentences?: Array<{
    SentenceID: string;
    Content: string;
    Status: number;
    CreatedAt: string;
  }>;
}

export interface TopContributor {
  // Raw API fields (kept for clarity)
  PersonID?: string;
  Email?: string;

  // Raw API fields for mapping
  TotalRecordings?: number;
  TotalSentenceContributions?: number;
  Recordings?: Array<{ SentenceID: string; Content: string; Duration?: number; RecordedAt?: string; AudioUrl?: string }>;

  // Mapped fields used by UI
  userEmail?: string;
  userId?: string | null;
  totalSentences?: number; // mapped from TotalSentencesDone
  TotalSentencesDone?: number;
  TotalContributedByUser?: number;
  TotalContributedApproved?: number;

  status1Count?: number;
  status2Count?: number;
  status3Count?: number;
  createdAt?: string | null;
  RecordedSentences?: Array<{
    SentenceID: string;
    Content: string;
    RecordingCount: number;
    ApprovedCount: number;
  }>;
  RecordingTotalCount?: number;
}

export interface AvailableSentence {
  SentenceID: string;
  Content: string;
  CreatedAt: string;
  Status: number;
}

interface UserState {
  userInfo: UserInfo | null;
  recordings: Recording[];
  currentRecordingIndex: number;
  currentSentence: string;
  currentSentenceId: string | null;
  availableSentences: AvailableSentence[];
  isRecording: boolean;
  recordingTime: number;
  users: User[];
  usersTotal: number;
  usersPage: number;
  usersLimit: number;
  usersTotalPages: number;
  usersTotalContributedSentences: number;
  usersTotalMale: number;
  usersTotalFemale: number;
  usersTotalCompletedSentences: number;
  usersLoading: boolean;
  usersError: string | null;
  creatingUser: boolean;
  createUserError: string | null;
  deletingUser: boolean;
  deleteUserError: string | null;
  loadingSentences: boolean;
  sentencesError: string | null;
}

const initialState: UserState = {
  userInfo: null,
  recordings: [],
  currentRecordingIndex: 0,
  currentSentence: "",
  currentSentenceId: null,
  availableSentences: [],
  isRecording: false,
  recordingTime: 0,
  users: [],
  usersTotal: 0,
  usersPage: 1,
  usersLimit: 10,
  usersTotalPages: 0,
  usersTotalContributedSentences: 0,
  usersTotalMale: 0,
  usersTotalFemale: 0,
  usersTotalCompletedSentences: 0,
  usersLoading: false,
  usersError: null,
  creatingUser: false,
  createUserError: null,
  deletingUser: false,
  deleteUserError: null,
  loadingSentences: false,
  sentencesError: null,
};

// Async thunk to fetch users with pagination
export interface FetchUsersParams {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  email?: string;
}

export interface FetchUsersResponse {
  users: User[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  totalContributedSentences: number;
  totalMale: number;
  totalFemale: number;
  totalCompletedSentences: number;
}

export const fetchUsers = createAsyncThunk<
  FetchUsersResponse,
  FetchUsersParams | undefined
>("user/fetchUsers", async (params) => {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const fromDate = params?.fromDate;
  const toDate = params?.toDate;
  const email = params?.email;

  const queryParams: Record<string, any> = { page, limit };
  if (fromDate) queryParams.fromDate = fromDate;
  if (toDate) queryParams.toDate = toDate;
  if (email) queryParams.email = email;

  const response = await axiosInstance.get("users", {
    params: queryParams,
  });
  const data = response.data;

  const rawDataArray: unknown[] = Array.isArray(data)
    ? data
    : (data && Array.isArray((data as { data?: unknown[] }).data)
        ? (data as { data: unknown[] }).data
        : []);

  // Map API fields to User interface fields
  const items: User[] = rawDataArray.map((item: unknown) => {
    const rawItem = item as {
      PersonID?: string;
      Email?: string;
      Gender?: string;
      Role?: string;
      CreatedAt?: string;
      TotalRecordings?: number;
      TotalRecordingDuration?: number;
      TotalSentenceContributions?: number;
      ApprovedRecordings?: number;
      ApprovedRecordingsCount?: number;
      TotalApprovedRecordingDuration?: number;
      Recordings?: Array<{ SentenceID: string; Content: string; Duration?: number; RecordedAt?: string; AudioUrl?: string }>;
      SentenceContributions?: Array<{ SentenceID: string; Content: string; Status: number; CreatedAt: string }>;
      SentencesDone?: Array<{ SentenceID: string; Content: string }>;
      CreatedSentences?: Array<{ SentenceID: string; Content: string; Status: number; CreatedAt: string }>;
    };
    return {
      PersonID: rawItem.PersonID ?? '',
      Email: rawItem.Email ?? '',
      Gender: rawItem.Gender ?? '',
      Role: rawItem.Role,
      CreatedAt: rawItem.CreatedAt ?? '',
      TotalRecordingDuration: rawItem.TotalRecordingDuration,
      TotalSentencesDone: rawItem.TotalRecordings, // Map TotalRecordings -> TotalSentencesDone
      ApprovedRecordingsCount:
        rawItem.ApprovedRecordingsCount ??
        rawItem.ApprovedRecordings ??
        undefined,
      TotalApprovedRecordingDuration: rawItem.TotalApprovedRecordingDuration,
      TotalContributedByUser: rawItem.TotalSentenceContributions, // Map TotalSentenceContributions -> TotalContributedByUser
      // Map Recordings -> SentencesDone (câu đã làm/đã ghi âm)
      SentencesDone: rawItem.Recordings?.map((r) => ({
        SentenceID: r.SentenceID,
        Content: r.Content,
        AudioUrl: r.AudioUrl,
        Duration: r.Duration,
        RecordedAt: r.RecordedAt,
      })) ?? rawItem.SentencesDone ?? [],
      // Map SentenceContributions -> CreatedSentences (câu đóng góp)
      CreatedSentences: rawItem.SentenceContributions?.map((s) => ({
        SentenceID: s.SentenceID,
        Content: s.Content,
        Status: s.Status,
        CreatedAt: s.CreatedAt,
      })) ?? rawItem.CreatedSentences ?? [],
    };
  });

  return {
    users: items,
    totalCount: (data as { totalCount?: number })?.totalCount ?? items.length,
    totalPages: (data as { totalPages?: number })?.totalPages ?? 1,
    currentPage: (data as { currentPage?: number })?.currentPage ?? page,
    limit: (data as { limit?: number })?.limit ?? limit,
    totalContributedSentences:
      (data as { totalContributedSentences?: number })?.totalContributedSentences ?? 0,
    totalMale: (data as { totalMale?: number })?.totalMale ?? 0,
    totalFemale: (data as { totalFemale?: number })?.totalFemale ?? 0,
    totalCompletedSentences:
      (data as { totalCompletedSentences?: number })?.totalCompletedSentences ?? 0,
  };
});

// Async thunk to search user by email
export interface SearchUserByEmailParams {
  email: string;
}

export interface SearchUserByEmailResponse {
  count: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  searchEmail: string;
  data: Array<{
    id: string;
    email: string;
    gender: string;
    role: string;
    createdAt: string;
    recordingCount: number;
    approvedCount: number;
    pendingCount: number;
    totalDuration: number;
  }>;
}

export const searchUserByEmail = createAsyncThunk<
  SearchUserByEmailResponse,
  SearchUserByEmailParams
>("user/searchUserByEmail", async (params) => {
  const response = await axiosInstance.get("users/search/by-email", {
    params: { email: params.email },
  });
  return response.data as SearchUserByEmailResponse;
});

// Async thunk to create user
export interface CreateUserRequest {
  email: string;
  gender: "male" | "female";
}

export interface CreateUserResponse {
  userId: string;
  [key: string]: unknown; // For other potential response fields
}

export const createUser = createAsyncThunk(
  "user/createUser",
  async (userData: CreateUserRequest): Promise<CreateUserResponse> => {
    const response = await axiosInstance.post<CreateUserResponse>("users", {
      email: userData.email,
      gender: userData.gender === "male" ? "Male" : "Female", // Convert to capitalized format
    });
    return response.data;
  }
);
export const deleteUser = createAsyncThunk(
  "user/deleteUser",
  async (personId: string): Promise<{ personId: string }> => {
    await axiosInstance.delete(`users/${personId}`);
    return { personId };
  }
);

export const fetchTopContributors = createAsyncThunk(
  "user/fetchTopContributors",
  async (): Promise<TopContributor[]> => {
    // Fetch top contributors from the dedicated endpoint
    const response = await axiosInstance.get("users/top-contributors", {
      params: { page: 1, limit: 10 },
    });
    const data = response.data;

    // Normalize to an array of items from data.data or raw array
    const rawArray: unknown[] = Array.isArray(data)
      ? data
      : (data && Array.isArray((data as { data?: unknown[] }).data)
          ? (data as { data: unknown[] }).data
          : []);

    return rawArray.map((item: unknown) => {
      const it = item as any;
      return {
        // Basic identity fields
        PersonID: it.userId ?? it.PersonID ?? undefined,
        Email: it.email ?? it.Email ?? undefined,
        userEmail: it.email ?? it.Email ?? it.userEmail ?? "Ẩn danh",
        userId: it.userId ?? it.PersonID ?? null,

        // Recording / contribution stats
        RecordingTotalCount: Number(
          it.TotalRecordings ??
          it.RecordingTotalCount ??
          it.TotalSentencesDone ??
          0
        ),
        TotalSentencesDone: Number(
          it.TotalRecordings ?? it.TotalSentencesDone ?? 0
        ),
        TotalContributedByUser: Number(
          it.TotalContributedSentences ?? it.TotalContributedByUser ?? 0
        ),
        TotalContributedApproved: Number(
          it.ApprovedRecordings ?? it.TotalContributedApproved ?? 0
        ),

        // 'Đã duyệt' = ApprovedRecordings from new API
        status1Count: Number(
          it.ApprovedRecordings ??
          it.TotalContributedApproved ??
          it.status1Count ??
          0
        ),
        status2Count: Number(it.status2Count ?? 0),
        status3Count: Number(it.status3Count ?? 0),

        createdAt: it.createdAt ?? it.CreatedAt ?? null,
        RecordedSentences: it.RecordedSentences ?? [],
      } as TopContributor;
    });
  }
);

// New thunk: fetch top contributors with pagination metadata
export interface FetchTopContributorsParams {
  page?: number;
  limit?: number;
}

export interface FetchTopContributorsResponse {
  items: TopContributor[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export const fetchTopContributorsPaginated = createAsyncThunk<
  FetchTopContributorsResponse,
  FetchTopContributorsParams | undefined
>("user/fetchTopContributorsPaginated", async (params) => {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  // Call the new top-contributors endpoint with pagination
  const response = await axiosInstance.get("users/top-contributors", {
    params: { page, limit },
  });
  const data = response.data;

  const rawArray: unknown[] = Array.isArray(data)
    ? data
    : (data && Array.isArray((data as { data?: unknown[] }).data)
        ? (data as { data: unknown[] }).data
        : []);

  const items: TopContributor[] = rawArray.map((item: unknown) => {
    const it = item as any;
    return {
      // Basic identity fields
      PersonID: it.userId ?? it.PersonID ?? undefined,
      Email: it.email ?? it.Email ?? undefined,
      userEmail: it.email ?? it.Email ?? it.userEmail ?? "Ẩn danh",
      userId: it.userId ?? it.PersonID ?? null,

      // Recording / contribution stats
      RecordingTotalCount: Number(
        it.TotalRecordings ??
        it.RecordingTotalCount ??
        it.TotalSentencesDone ??
        0
      ),
      totalSentences: Number(
        it.TotalContributedSentences ??
        it.TotalSentenceContributions ??
        it.TotalContributedByUser ??
        it.totalSentences ??
        0
      ),
      TotalSentencesDone: Number(
        it.TotalRecordings ?? it.TotalSentencesDone ?? 0
      ),
      TotalContributedByUser: Number(
        it.TotalContributedSentences ?? it.TotalContributedByUser ?? 0
      ),
      TotalContributedApproved: Number(
        it.ApprovedRecordings ?? it.TotalContributedApproved ?? 0
      ),
      // 'Đã duyệt' = ApprovedRecordings from new API
      status1Count: Number(
        it.ApprovedRecordings ??
        it.TotalContributedApproved ??
        it.status1Count ??
        0
      ),
      status2Count: Number(it.status2Count ?? 0),
      status3Count: Number(it.status3Count ?? 0),
      createdAt: it.createdAt ?? it.CreatedAt ?? null,
      RecordedSentences: it.RecordedSentences ?? [],
    } as TopContributor;
  });

  return {
    items,
    totalCount: (data as { totalCount?: number })?.totalCount ?? items.length,
    totalPages: (data as { totalPages?: number })?.totalPages ?? 1,
    currentPage: (data as { currentPage?: number })?.currentPage ?? page,
    limit: (data as { limit?: number })?.limit ?? limit,
  };
});

// Async thunk to fetch available sentences (sentences with status === 1)
// Calls the approved-without-recordings endpoint
export const fetchAvailableSentences = createAsyncThunk(
  "user/fetchAvailableSentences",
  async (_personId: string): Promise<AvailableSentence[]> => {
    try {
      // Call the new API endpoint directly
      const response = await axiosInstance.get("sentences/approved-without-recordings", {
        params: { page: 1, limit: 20 }
      });
      
      const responseData = response.data;
      
      // Handle the response structure: { count, totalCount, totalPages, currentPage, data: [...] }
      const sentences = responseData?.data || [];
      
      // Map to AvailableSentence format
      return sentences.map((s: any) => ({
        SentenceID: s.SentenceID,
        Content: s.Content,
        CreatedAt: s.CreatedAt,
        Status: s.Status,
      }));
    } catch (error) {
      console.error("Error in fetchAvailableSentences:", error);
      throw error;
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserInfo: (state, action: PayloadAction<UserInfo>) => {
      state.userInfo = action.payload;
    },
    setCurrentSentence: (state, action: PayloadAction<string>) => {
      state.currentSentence = action.payload;
    },
    setCurrentSentenceId: (state, action: PayloadAction<string | null>) => {
      state.currentSentenceId = action.payload;
    },
    setAvailableSentences: (
      state,
      action: PayloadAction<AvailableSentence[]>
    ) => {
      state.availableSentences = action.payload;
    },
    addRecording: (state, action: PayloadAction<Recording>) => {
      state.recordings.push(action.payload);
    },
    updateRecording: (
      state,
      action: PayloadAction<{ index: number; recording: Partial<Recording> }>
    ) => {
      const { index, recording } = action.payload;
      if (state.recordings[index]) {
        state.recordings[index] = { ...state.recordings[index], ...recording };
      }
    },
    setCurrentRecordingIndex: (state, action: PayloadAction<number>) => {
      state.currentRecordingIndex = action.payload;
    },
    setIsRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
    setRecordingTime: (state, action: PayloadAction<number>) => {
      state.recordingTime = action.payload;
    },
    resetRecordings: (state) => {
      state.recordings = [];
      state.currentRecordingIndex = 0;
      state.isRecording = false;
      state.recordingTime = 0;
    },
    resetUserState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.usersLoading = true;
        state.usersError = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.usersLoading = false;
        state.users = action.payload.users;
        state.usersTotal = action.payload.totalCount;
        state.usersPage = action.payload.currentPage;
        state.usersLimit = action.payload.limit;
        state.usersTotalPages = action.payload.totalPages;
        state.usersTotalContributedSentences = action.payload.totalContributedSentences;
        state.usersTotalMale = action.payload.totalMale;
        state.usersTotalFemale = action.payload.totalFemale;
        state.usersTotalCompletedSentences = action.payload.totalCompletedSentences;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.usersLoading = false;
        state.usersError = action.error.message || "Failed to fetch users";
      })
      .addCase(createUser.pending, (state) => {
        state.creatingUser = true;
        state.createUserError = null;
      })
      .addCase(createUser.fulfilled, (state) => {
        state.creatingUser = false;
        // userId will be set via setUserInfo action after API call
      })
      .addCase(createUser.rejected, (state, action) => {
        state.creatingUser = false;
        state.createUserError = action.error.message || "Failed to create user";
      })
      .addCase(fetchAvailableSentences.pending, (state) => {
        state.loadingSentences = true;
        state.sentencesError = null;
      })
      .addCase(fetchAvailableSentences.fulfilled, (state, action) => {
        state.loadingSentences = false;
        state.availableSentences = action.payload;
        // Set first available sentence as current if available
        if (action.payload.length > 0 && !state.currentSentence) {
          state.currentSentence = action.payload[0].Content;
          state.currentSentenceId = action.payload[0].SentenceID;
        }
      })
      .addCase(fetchAvailableSentences.rejected, (state, action) => {
        state.loadingSentences = false;
        state.sentencesError =
          action.error.message || "Failed to fetch available sentences";
      })
      .addCase(deleteUser.pending, (state) => {
        state.deletingUser = true;
        state.deleteUserError = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.deletingUser = false;
        // Remove deleted user from the list
        state.users = state.users.filter(
          (user) => user.PersonID !== action.payload.personId
        );
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.deletingUser = false;
        state.deleteUserError = action.error.message || "Failed to delete user";
      });
  },
});

export const {
  setUserInfo,
  setCurrentSentence,
  setCurrentSentenceId,
  setAvailableSentences,
  addRecording,
  updateRecording,
  setCurrentRecordingIndex,
  setIsRecording,
  setRecordingTime,
  resetRecordings,
  resetUserState,
} = userSlice.actions;

export default userSlice.reducer;
