import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useSelector, useDispatch } from "react-redux";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import userReducer from "../features/userSlice";

// Config cho user reducer - chỉ lưu userInfo
const userPersistConfig = {
  key: "user",
  storage,
  whitelist: ["userInfo"], // Chỉ lưu userInfo (email, gender, userId)
};

// Apply persist to user reducer
const persistedUserReducer = persistReducer(userPersistConfig, userReducer);
// Config cho root
// const presistConfig = {
//   key: "root",
//   storage,
//   whitelist: ["user"], // Chỉ lưu user state
// };
// Create root reducer
const rootReducer = combineReducers({
  user: persistedUserReducer,
});
// Apply persist to root reducer
//const persistedReducer = persistReducer(presistConfig, rootReducer);
// Combine all reducers
export const store = configureStore({
  // reducer: persistedReducer,
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Persist the store
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks for using TypedUseSelectorHook
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
