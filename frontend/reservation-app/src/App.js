import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ReservePage from "./pages/ReservePage";
import AdminPage from "./pages/AdminPage";
import CalendarPage from "./pages/CalendarPage";
import MenuOverlay from "./components/MenuOverlay";
import BackgroundSlider from "./components/BackgroundSlider";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_USER_UID = "ST9JR8hBt4fKA5BambsPslt6ZuJ2";
const BACKGROUND_IMAGES = [
  "/images/field1.png",
  "/images/field2.png",
  "/images/field3.png",
  "/images/field4.png",
  "/images/field5.png",
  "/images/field6.png",
  "/images/field7.png",
];

function App() {
  const menuRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(10);
  const [selectedDate, setSelectedDate] = useState(null);
  const [adminReservations, setAdminReservations] = useState([]);
  const [adminSearchTerm, setAdminSearchTerm] = useState("");
  const [businessOpenTime, setBusinessOpenTime] = useState("09:00");
  const [businessCloseTime, setBusinessCloseTime] = useState("17:00");
  const [businessHoursSaving, setBusinessHoursSaving] = useState(false);
  const [reservationsByDate, setReservationsByDate] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [adminAuthChecked, setAdminAuthChecked] = useState(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [reserveStep, setReserveStep] = useState("form");
  const [reserveData, setReserveData] = useState(null);

  const pathname = window.location.pathname;
  const isLoginPage = pathname === "/login";
  const isSignupPage = pathname === "/signup";
  const isReservePage = pathname === "/reserve";
  const isAdminPage = pathname === "/admin";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAdminPage) return;

    const unsubscribe = auth.onAuthStateChanged((user) => {
      const isAuthorized = !!user && user.uid === ADMIN_USER_UID;
      setIsAdminAuthorized(isAuthorized);
      setAdminAuthChecked(true);

      if (!isAuthorized) {
        alert("管理者としてログインしてください。");
        window.location.href = "/login";
      }
    });

    return () => {
      setAdminAuthChecked(false);
      setIsAdminAuthorized(false);
      unsubscribe();
    };
  }, [isAdminPage]);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    const form = event.target;
    const email = form.elements.email.value;
    const password = form.elements.password.value;

    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert(`${email} でログインしました。`);
      window.location.href = email === ADMIN_EMAIL ? "/admin" : "/reserve";
    } catch (error) {
      console.error("ログインエラー:", error);
      alert("ログインに失敗しました: " + error.message);
    }
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    const form = event.target;
    const email = form.elements.email.value;
    const password = form.elements.password.value;
    const confirm = form.elements.confirm.value;

    if (!email || !password || !confirm) {
      alert("すべての項目を入力してください。");
      return;
    }

    if (password !== confirm) {
      alert("パスワードが一致しません。");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("新規登録ユーザー:", userCredential.user);
      alert("登録が完了しました: " + email);
      window.location.href = "/login";
    } catch (error) {
      console.error("新規登録エラー:", error);
      alert(
        error.code === "auth/weak-password"
          ? "パスワードは6文字以上にしてください。"
          : "登録に失敗しました: " + error.message
      );
    }
  };

  const handleReservationSubmit = (event) => {
    event.preventDefault();
    const form = event.target;
    const name = form.elements.name.value;
    const email = form.elements.email.value;
    const groupName = form.elements.groupName.value;
    const date = form.elements.date.value;
    const time = form.elements.time.value;
    const peopleCountStr = form.elements.peopleCount.value;
    const peopleCount = Number(peopleCountStr);
    const rentalNeededValue = form.elements.rentalNeeded?.value;

    if (
      !name ||
      !email ||
      !groupName ||
      !date ||
      !time ||
      !peopleCountStr ||
      !rentalNeededValue
    ) {
      alert("すべての項目を入力してください。");
      return;
    }

    if (Number.isNaN(peopleCount) || peopleCount <= 0) {
      alert("人数は1以上の数値で入力してください。");
      return;
    }

    let session = "";
    if (time >= "09:00" && time <= "11:00") {
      session = "午前の部";
    } else if (time >= "13:00" && time <= "16:00") {
      session = "午後の部";
    } else {
      alert("参加時間は 9:00〜11:00 または 13:00〜16:00 の間で選択してください。");
      return;
    }

    const rentalNeeded = rentalNeededValue === "yes";
    const existingReservations = reservationsByDate[date] || [];
    const currentTotal = existingReservations.reduce(
      (sum, reservation) => sum + (reservation.peopleCount || 0),
      0
    );

    if (currentTotal + peopleCount > 40) {
      alert(
        `この日の参加可能人数（40名）を超えてしまいます。\n\n` +
          `現在の予約人数：${currentTotal}名\n` +
          `あなたの人数：${peopleCount}名\n\n` +
          `→ 合計 ${currentTotal + peopleCount}名は上限を超えます。`
      );
      return;
    }

    setReserveData({
      name,
      email,
      groupName,
      date,
      time,
      peopleCount,
      rentalNeeded,
      session,
    });
    setReserveStep("confirm");
  };

  const handleConfirmReservation = async () => {
    if (!reserveData) return;

    const {
      name,
      email,
      groupName,
      date,
      time,
      peopleCount,
      rentalNeeded,
      session,
    } = reserveData;

    try {
      const reservationsRef = collection(db, "reservations");
      const user = auth.currentUser;
      const docRef = await addDoc(reservationsRef, {
        name,
        email,
        team: groupName,
        date,
        time,
        peopleCount,
        rentalNeeded,
        session,
        checkedIn: false,
        userId: user ? user.uid : null,
        createdAt: serverTimestamp(),
      });

      if (user) {
        const userRef = doc(db, "users", user.uid);
        await setDoc(
          userRef,
          {
            name,
            email,
            groupName,
          },
          { merge: true }
        );
        setUserProfile((prev) => ({
          ...(prev || {}),
          name,
          email,
          groupName,
        }));
      }

      alert(
        `予約を受け付けました。\n\n` +
          `日付: ${date}\n` +
          `時間: ${time}\n` +
          `チーム名: ${groupName}\n` +
          `人数: ${peopleCount}名\n` +
          `レンタル装備: ${rentalNeeded ? "必要" : "不要"}\n` +
          `お名前: ${name}\n` +
          `メール: ${email}`
      );

      setReservationsByDate((prev) => {
        const prevList = prev[date] || [];
        return {
          ...prev,
          [date]: [
            ...prevList,
            {
              id: docRef.id,
              groupName,
              time,
              peopleCount,
              session,
            },
          ],
        };
      });

      sessionStorage.removeItem("reserveDate");
      setReserveData(null);
      setReserveStep("form");
      window.location.href = "/";
    } catch (error) {
      console.error("予約登録エラー:", error);
      alert("予約の登録に失敗しました: " + error.message);
    }
  };

  const handleDeleteReservation = async (id) => {
    if (!window.confirm("この予約を削除してよろしいですか？")) return;

    try {
      await deleteDoc(doc(db, "reservations", id));
      setAdminReservations((prev) => prev.filter((reservation) => reservation.id !== id));

      setReservationsByDate((prev) => {
        const nextMap = { ...prev };
        Object.keys(nextMap).forEach((dateKey) => {
          nextMap[dateKey] = nextMap[dateKey].filter((item) => item.id !== id);
          if (nextMap[dateKey].length === 0) {
            delete nextMap[dateKey];
          }
        });
        return nextMap;
      });
    } catch (error) {
      console.error("予約削除エラー:", error);
      alert("予約の削除に失敗しました: " + error.message);
    }
  };

  const handleSaveBusinessHours = async () => {
    if (!businessOpenTime || !businessCloseTime) {
      alert("開店時間と閉店時間を入力してください。");
      return;
    }

    try {
      setBusinessHoursSaving(true);
      const ref = doc(db, "settings", "businessHours");
      await setDoc(ref, {
        openTime: businessOpenTime,
        closeTime: businessCloseTime,
      });
      alert("営業時間を保存しました。");
    } catch (error) {
      console.error("営業時間の保存エラー:", error);
      alert("営業時間の保存に失敗しました: " + error.message);
    } finally {
      setBusinessHoursSaving(false);
    }
  };

  const handleToggleCheckIn = async (id, currentCheckedIn) => {
    try {
      await updateDoc(doc(db, "reservations", id), {
        checkedIn: !currentCheckedIn,
      });

      setAdminReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === id
            ? { ...reservation, checkedIn: !currentCheckedIn }
            : reservation
        )
      );

      setReservationsByDate((prev) => {
        const nextMap = { ...prev };
        Object.keys(nextMap).forEach((dateKey) => {
          nextMap[dateKey] = nextMap[dateKey].map((item) =>
            item.id === id ? { ...item, checkedIn: !currentCheckedIn } : item
          );
        });
        return nextMap;
      });
    } catch (error) {
      console.error("チェックイン更新エラー:", error);
      alert("チェックイン状態の更新に失敗しました: " + error.message);
    }
  };

  const handleBackToReservationForm = () => {
    setReserveStep("form");
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startWeekday; i += 1) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      days.push(d);
    }
    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((year) => year - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((month) => month - 1);
    }
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((year) => year + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((month) => month + 1);
    }
    setSelectedDate(null);
  };

  const formatDateKey = (year, month, day) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const getReservationsForDate = (dateKey) => reservationsByDate[dateKey] || [];

  const selectedReservations = selectedDate ? getReservationsForDate(selectedDate) : [];
  const monthLabel = `${currentYear}年 ${currentMonth + 1}月`;

  const handleReserveClick = () => {
    if (!selectedDate) {
      alert("日付を選択してください。");
      return;
    }
    sessionStorage.setItem("reserveDate", selectedDate);
    window.location.href = "/login";
  };

  useEffect(() => {
    if (!isAdminPage) return;

    const fetchAdminReservations = async () => {
      try {
        const snapshot = await getDocs(collection(db, "reservations"));
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name,
            email: data.email,
            team: data.team,
            date: data.date,
            time: data.time,
            peopleCount: data.peopleCount || 0,
            checkedIn: data.checkedIn || false,
            session: data.session || "",
          };
        });

        list.sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
        setAdminReservations(list);
      } catch (error) {
        console.error("管理者予約一覧取得エラー:", error);
      }
    };

    fetchAdminReservations();
  }, [isAdminPage]);

  useEffect(() => {
    if (!isAdminPage) return;

    const fetchBusinessHours = async () => {
      try {
        const ref = doc(db, "settings", "businessHours");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setBusinessOpenTime(data.openTime || "09:00");
          setBusinessCloseTime(data.closeTime || "17:00");
        } else {
          console.log("businessHours 設定がまだありません");
        }
      } catch (error) {
        console.error("営業時間設定の取得エラー:", error);
      }
    };

    fetchBusinessHours();
  }, [isAdminPage]);

  const filteredAdminReservations = adminReservations.filter((reservation) => {
    if (!adminSearchTerm) return true;
    const keyword = adminSearchTerm.toLowerCase();

    const name = (reservation.name || "").toLowerCase();
    const email = (reservation.email || "").toLowerCase();
    const team = (reservation.team || "").toLowerCase();
    const date = (reservation.date || "").toLowerCase();
    const time = (reservation.time || "").toLowerCase();

    return (
      name.includes(keyword) ||
      email.includes(keyword) ||
      team.includes(keyword) ||
      date.includes(keyword) ||
      time.includes(keyword)
    );
  });

  const adminSummary = useMemo(
    () => ({
      totalCount: filteredAdminReservations.length,
      checkedInCount: filteredAdminReservations.filter((item) => item.checkedIn).length,
      totalPeople: filteredAdminReservations.reduce(
        (sum, item) => sum + (item.peopleCount || 0),
        0
      ),
    }),
    [filteredAdminReservations]
  );

  const groupedAdminReservations = useMemo(() => {
    const groups = {};
    filteredAdminReservations.forEach((reservation) => {
      if (!reservation.date) return;
      if (!groups[reservation.date]) {
        groups[reservation.date] = [];
      }
      groups[reservation.date].push(reservation);
    });

    return Object.entries(groups)
      .sort(([d1], [d2]) => d1.localeCompare(d2))
      .map(([date, list]) => ({
        date,
        list: list.sort((a, b) => a.time.localeCompare(b.time)),
      }));
  }, [filteredAdminReservations]);

  useEffect(() => {
    if (!isReservePage) return;
    const user = auth.currentUser;
    if (!user) return;

    const loadUserProfile = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setUserProfile({
            name: data.name || "",
            email: data.email || user.email || "",
            groupName: data.groupName || "",
          });
        } else {
          setUserProfile({
            name: "",
            email: user.email || "",
            groupName: "",
          });
        }
      } catch (error) {
        console.error("ユーザープロフィール取得エラー:", error);
      }
    };

    loadUserProfile();
  }, [isReservePage]);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const reservationsRef = collection(db, "reservations");
        const snapshot = await getDocs(reservationsRef);
        const map = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const date = data.date;
          if (!date) return;
          if (!map[date]) {
            map[date] = [];
          }
          map[date].push({
            id: docSnap.id,
            groupName: data.team,
            time: data.time,
            peopleCount: data.peopleCount,
            session: data.session || "",
          });
        });

        setReservationsByDate(map);
      } catch (error) {
        console.error("予約データ取得エラー:", error);
      }
    };

    fetchReservations();
  }, []);

  const reservedDate =
    typeof window !== "undefined"
      ? sessionStorage.getItem("reserveDate") || ""
      : "";

  const reserveInitialValues = {
    name: reserveData ? reserveData.name : userProfile?.name || "",
    email: reserveData ? reserveData.email : userProfile?.email || "",
    groupName: reserveData ? reserveData.groupName : userProfile?.groupName || "",
    date: reserveData ? reserveData.date : reservedDate,
    time: reserveData ? reserveData.time : "",
    peopleCount: reserveData ? reserveData.peopleCount : "",
    rentalNeeded: reserveData ? reserveData.rentalNeeded : null,
  };

  const redirectTo = (path) => {
    window.location.href = path;
  };

  let mainContent = null;

  if (isLoginPage) {
    mainContent = (
      <LoginPage
        onSubmit={handleLoginSubmit}
        onSignupClick={() => redirectTo("/signup")}
        onBackClick={() => redirectTo("/")}
      />
    );
  } else if (isSignupPage) {
    mainContent = (
      <SignupPage onSubmit={handleSignupSubmit} onBackClick={() => redirectTo("/login")} />
    );
  } else if (isReservePage) {
    mainContent = (
      <ReservePage
        reserveStep={reserveStep}
        reserveData={reserveData}
        initialValues={reserveInitialValues}
        onSubmit={handleReservationSubmit}
        onConfirm={handleConfirmReservation}
        onEdit={handleBackToReservationForm}
        onBackToCalendar={() => redirectTo("/")}
      />
    );
  } else if (isAdminPage) {
    mainContent = (
      <AdminPage
        adminAuthChecked={adminAuthChecked}
        isAdminAuthorized={isAdminAuthorized}
        adminSearchTerm={adminSearchTerm}
        onSearchTermChange={setAdminSearchTerm}
        businessOpenTime={businessOpenTime}
        businessCloseTime={businessCloseTime}
        onBusinessOpenChange={setBusinessOpenTime}
        onBusinessCloseChange={setBusinessCloseTime}
        onSaveBusinessHours={handleSaveBusinessHours}
        businessHoursSaving={businessHoursSaving}
        summary={adminSummary}
        groupedReservations={groupedAdminReservations}
        onToggleCheckIn={handleToggleCheckIn}
        onDeleteReservation={handleDeleteReservation}
        onBackToCalendar={() => redirectTo("/")}
      />
    );
  } else {
    mainContent = (
      <CalendarPage
        monthLabel={monthLabel}
        calendarDays={calendarDays}
        selectedDate={selectedDate}
        selectedReservations={selectedReservations}
        onSelectDate={setSelectedDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onReserveClick={handleReserveClick}
        getReservationsForDate={getReservationsForDate}
        formatDateKey={formatDateKey}
        currentYear={currentYear}
        currentMonth={currentMonth}
      />
    );
  }

  return (
    <div className="app-root app">
      <MenuOverlay
        isOpen={isMenuOpen}
        menuRef={menuRef}
        onToggle={() => setIsMenuOpen((prev) => !prev)}
        onNavigateTop={() => redirectTo("/")}
        onNavigateLogin={() => redirectTo("/login")}
      />

      <BackgroundSlider images={BACKGROUND_IMAGES} />

      {mainContent}
    </div>
  );
}

export default App;