import axiosInstance from "@/services/constant/axiosInstance";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginRequestEmail {
  email: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  userid?: string;
  role?: string;
}

export interface UserData {
  PersonID: string;
  Email: string;
  Name?: string;
  Gender?: string;
  Age?: number;
  Role?: string;
}

// Admin/Manager login with username and password
export const loginAdminWithPassword = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await axiosInstance.post<LoginResponse>(
      "/login",
      { username, password }
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Login failed", token: "", userid: "" };
  }
};

// User login with email only
export const loginAdmin = async (email: string): Promise<LoginResponse> => {
  try {
    const response = await axiosInstance.post<LoginResponse>(
      "users/login",
      { email }
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Login failed", token: "", userid: "" };
  }
};

export const fetchUserData = async (userId: string): Promise<UserData> => {
  try {
    const response = await axiosInstance.get<{ data: UserData[] }>(
      `users/${userId}`
    );
    // API returns { data: [...] } so get first element
    if (Array.isArray(response.data)) {
      return response.data[0];
    }
    if (response.data.data && Array.isArray(response.data.data)) {
      return response.data.data[0];
    }
    return response.data as any;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to fetch user data" };
  }
};
