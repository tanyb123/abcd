import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebaseClient';

// Tạo context cho xác thực
interface AuthContextType {
  currentUser: (User & { role?: string; displayName?: string }) | null;
  userRole: string | null;
  user: (User & { role?: string; displayName?: string }) | null;
  loadingAuth: boolean;
  error: string | null;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  register: (email: string, password: string, displayName?: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  getGoogleAccessToken: () => Promise<string>;
  googleAccessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component để cung cấp trạng thái xác thực cho toàn bộ ứng dụng
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Các state cần thiết
  const [currentUser, setCurrentUser] = useState<
    (User & { role?: string; displayName?: string }) | null
  >(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // Hàm lấy thông tin người dùng từ Firestore
  const fetchUserData = useCallback(async (userAuth: User) => {
    if (!userAuth) return null;

    const userRef = doc(db, 'users', userAuth.uid);
    try {
      console.log('Đang lấy dữ liệu user cho:', userAuth.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        console.log('Đã tìm thấy dữ liệu user:', docSnap.data());
        const userData = docSnap.data();
        return {
          ...userAuth,
          role: userData.role || 'user',
          displayName: userData.displayName || userAuth.displayName,
        };
      } else {
        console.log('Không tìm thấy tài liệu user! Đang tạo mới.');
        const newUser = {
          email: userAuth.email,
          role: 'user',
          createdAt: serverTimestamp(),
          displayName: userAuth.displayName || userAuth.email?.split('@')[0] || '',
          photoURL: userAuth.photoURL || '',
        };
        await setDoc(userRef, newUser);
        console.log('Đã tạo tài liệu user mới.');
        return {
          ...userAuth,
          role: 'user',
          displayName: newUser.displayName,
        };
      }
    } catch (err) {
      console.error('Lỗi khi lấy/tạo tài liệu user:', err);
      // Dữ liệu dự phòng
      return {
        ...userAuth,
        displayName: userAuth.displayName || userAuth.email?.split('@')[0] || '',
        role: 'user',
      };
    }
  }, []);

  // Lắng nghe sự thay đổi trạng thái xác thực
  useEffect(() => {
    console.log('Đang thiết lập auth state listener...');

    // Kiểm tra xem auth đã được khởi tạo chưa
    if (!auth) {
      console.error('Auth instance chưa được khởi tạo!');
      setLoadingAuth(false);
      setError('Dịch vụ xác thực không khả dụng');
      return () => {};
    }

    // Khôi phục Google access token từ localStorage nếu có
    const savedToken = localStorage.getItem('googleAccessToken');
    if (savedToken) {
      setGoogleAccessToken(savedToken);
    }

    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      console.log(
        'Trạng thái auth đã thay đổi:',
        userAuth ? 'User đã đăng nhập' : 'User đã đăng xuất'
      );
      setLoadingAuth(true);

      try {
        if (userAuth) {
          const userData = await fetchUserData(userAuth);
          if (userData) {
            setCurrentUser(userData);
            setUserRole(userData.role || 'user');
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
          setGoogleAccessToken(null);
          localStorage.removeItem('googleAccessToken');
        }
      } catch (err) {
        console.error('Lỗi trong auth state change:', err);
        setError('Đã xảy ra lỗi xác thực.');
      } finally {
        setLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  // Hàm đăng nhập
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoadingAuth(true);
      setError(null);

      await signInWithEmailAndPassword(auth, email, password);
      console.log('Đăng nhập thành công:', email);
      return true;
    } catch (error: any) {
      console.error('Lỗi đăng nhập:', error);
      let errorMessage = 'Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập.';

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Địa chỉ email không hợp lệ.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Tài khoản này đã bị vô hiệu hóa.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Không tìm thấy tài khoản với email này.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Mật khẩu không đúng.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Lỗi mạng. Vui lòng kiểm tra kết nối.';
          break;
      }

      setError(errorMessage);
      return false;
    } finally {
      setLoadingAuth(false);
    }
  };

  // Hàm đăng ký
  const register = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<boolean> => {
    try {
      setLoadingAuth(true);
      setError(null);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        displayName: displayName || email.split('@')[0],
        role: 'user',
        createdAt: serverTimestamp(),
        photoURL: '',
      });

      console.log('Đăng ký thành công:', email);
      return true;
    } catch (error: any) {
      console.error('Lỗi đăng ký:', error);
      let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email này đã được đăng ký.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Địa chỉ email không hợp lệ.';
          break;
        case 'auth/weak-password':
          errorMessage =
            'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Lỗi mạng. Vui lòng kiểm tra kết nối.';
          break;
      }

      setError(errorMessage);
      return false;
    } finally {
      setLoadingAuth(false);
    }
  };

  // Hàm đăng xuất
  const logout = async (): Promise<boolean> => {
    try {
      // Đăng xuất khỏi Firebase
      await signOut(auth);

      // Xóa Google access token
      setGoogleAccessToken(null);
      localStorage.removeItem('googleAccessToken');

      // Cập nhật state
      setCurrentUser(null);
      setUserRole(null);

      console.log('Đăng xuất thành công');
      return true;
    } catch (error) {
      console.error('Đăng xuất thất bại:', error);
      setError('Đăng xuất thất bại. Vui lòng thử lại.');
      return false;
    }
  };

  // Hàm quên mật khẩu
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      setLoadingAuth(true);
      setError(null);
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error: any) {
      console.error('Lỗi reset mật khẩu:', error);
      let errorMessage =
        'Không thể gửi email reset mật khẩu. Vui lòng thử lại.';

      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Địa chỉ email không hợp lệ.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Không tìm thấy tài khoản với email này.';
          break;
      }

      setError(errorMessage);
      return false;
    } finally {
      setLoadingAuth(false);
    }
  };

  // Hàm đăng nhập Google
  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      setLoadingAuth(true);
      setError(null);

      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.addScope('https://www.googleapis.com/auth/drive.file');

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Lấy Google access token từ credential
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        // Lưu access token vào state
        setGoogleAccessToken(credential.accessToken);
        // Lưu vào localStorage để giữ lại sau khi refresh
        localStorage.setItem('googleAccessToken', credential.accessToken);
        console.log('Đã lưu Google access token');
      }

      // Lưu thông tin user vào Firestore nếu chưa có
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || '',
          role: 'user',
          createdAt: serverTimestamp(),
          photoURL: user.photoURL || '',
        });
      }

      console.log('Đăng nhập Google thành công');
      return true;
    } catch (error: any) {
      console.error('Lỗi đăng nhập Google:', error);
      let errorMessage = 'Đăng nhập Google thất bại. Vui lòng thử lại.';

      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Cửa sổ đăng nhập đã bị đóng.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Cửa sổ đăng nhập bị chặn. Vui lòng cho phép popup.';
      }

      setError(errorMessage);
      return false;
    } finally {
      setLoadingAuth(false);
    }
  };

  // Lấy Google Access Token
  const getGoogleAccessToken = async (): Promise<string> => {
    if (!currentUser) {
      throw new Error('Người dùng chưa đăng nhập');
    }

    // Kiểm tra xem đã có token trong state hoặc localStorage chưa
    if (googleAccessToken) {
      // Kiểm tra token còn hợp lệ không bằng cách gọi API Google Drive
      try {
        const testResponse = await fetch(
          'https://www.googleapis.com/drive/v3/about?fields=user',
          {
            headers: {
              Authorization: `Bearer ${googleAccessToken}`,
            },
          }
        );

        if (testResponse.ok) {
          return googleAccessToken;
        }
      } catch (error) {
        console.log('Token không còn hợp lệ, cần lấy token mới');
      }
    }

    // Nếu không có token hoặc token hết hạn, yêu cầu đăng nhập lại
    const googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('https://www.googleapis.com/auth/drive');
    googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
    // Thêm prompt để không hiển thị popup nếu user đã đăng nhập
    googleProvider.setCustomParameters({
      prompt: 'select_account',
    });

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (credential?.accessToken) {
        // Lưu token mới
        setGoogleAccessToken(credential.accessToken);
        localStorage.setItem('googleAccessToken', credential.accessToken);
        return credential.accessToken;
      }

      throw new Error(
        'Không thể lấy Google access token. Vui lòng đăng nhập bằng Google.'
      );
    } catch (error: any) {
      console.error('Lỗi khi lấy Google Access Token:', error);
      
      // Nếu popup bị chặn hoặc đóng, thử lấy từ localStorage
      const savedToken = localStorage.getItem('googleAccessToken');
      if (savedToken) {
        try {
          const testResponse = await fetch(
            'https://www.googleapis.com/drive/v3/about?fields=user',
            {
              headers: {
                Authorization: `Bearer ${savedToken}`,
              },
            }
          );

          if (testResponse.ok) {
            setGoogleAccessToken(savedToken);
            return savedToken;
          }
        } catch (e) {
          console.error('Token trong localStorage cũng không hợp lệ');
        }
      }

      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Cửa sổ đăng nhập đã bị đóng. Vui lòng thử lại.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Cửa sổ đăng nhập bị chặn. Vui lòng cho phép popup.');
      }

      throw error;
    }
  };

  // Giá trị context để cung cấp cho toàn bộ ứng dụng
  const value: AuthContextType = {
    currentUser,
    userRole,
    user: currentUser,
    loadingAuth,
    error,
    isSignedIn: !!currentUser,
    login,
    logout,
    register,
    resetPassword,
    signInWithGoogle,
    getGoogleAccessToken,
    googleAccessToken, // Thêm vào để các component có thể kiểm tra trực tiếp
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook để sử dụng AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  return context;
};

export default AuthContext;

