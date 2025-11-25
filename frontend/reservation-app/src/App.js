import React, { useState, useMemo, useEffect, useRef } from "react";
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
  getDoc,      // ★ 追加：ドキュメントを1件読む
  setDoc,      // ★ 追加：ドキュメントを保存（作成/上書き）
} from "firebase/firestore";

function App() {
  // ★ MFDメニュー用 state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  // state ロジック
  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(10); // 0=Jan, 10=Nov
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"

  // 管理者画面用：予約一覧
  const [adminReservations, setAdminReservations] = useState([]);

  // ★ 管理者画面用：検索ワード
  const [adminSearchTerm, setAdminSearchTerm] = useState("");

    // ★ 管理者画面用：営業時間（開店/閉店時間）
    const [businessOpenTime, setBusinessOpenTime] = useState("09:00");
    const [businessCloseTime, setBusinessCloseTime] = useState("17:00");
    const [businessHoursSaving, setBusinessHoursSaving] = useState(false);

  // Firestore から読み込んだ予約データ { "YYYY-MM-DD": [{ id, groupName, time, peopleCount }, ...] }
  const [reservationsByDate, setReservationsByDate] = useState({});

  // 画像リスト（public/images 配下に置く想定）
  const images = [
    "/images/field1.png",
    "/images/field2.png",
    "/images/field3.png",
    "/images/field4.png",
    "/images/field5.png",
    "/images/field6.png",
    "/images/field7.png",
  ];

  // React.createElement を短く書くためのエイリアス
  const h = React.createElement;

  // 画面種別
  const isLoginPage = window.location.pathname === "/login";
  const isSignupPage = window.location.pathname === "/signup";
  const isReservePage = window.location.pathname === "/reserve";
  const isAdminPage = window.location.pathname === "/admin";

  // 予約フォーム → 確認画面のステップ管理
  const [reserveStep, setReserveStep] = useState("form"); // "form" or "confirm"
  const [reserveData, setReserveData] = useState(null); // { name, email, groupName, date, time, peopleCount, rentalNeeded }

  // ログインフォーム送信時
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
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("ログインユーザー:", userCredential.user);
  
      const reservedDate = sessionStorage.getItem("reserveDate");
      console.log("ログイン後に使う日付: ", reservedDate);
  
      alert(email + " でログインしました。");
  
      // ★ 管理者判定（ここに管理者用メールアドレスを設定）
      const adminEmail = "admin@gmail.com";  // ← 実際の管理者メールに変更してください
  
      if (email === adminEmail) {
        // 管理者は管理画面へ
        window.location.href = "/admin";
      } else {
        // 一般ユーザーは予約フォームへ
        window.location.href = "/reserve";
      }
    } catch (error) {
      console.error("ログインエラー:", error);
      alert("ログインに失敗しました: " + error.message);
    }
  };

  // 新規登録フォーム送信時
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
      if (error.code === "auth/weak-password") {
        alert("パスワードは6文字以上にしてください。");
      } else {
        alert("登録に失敗しました: " + error.message);
      }
    }
  };

  // 予約フォーム送信時（確認画面へ）
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

    // レンタル装備
    const rentalNeededValue = form.elements.rentalNeeded?.value; // "yes" or "no"

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

    // ★ ここで「午前の部 / 午後の部」を判定
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

    setReserveData({
      name,
      email,
      groupName,
      date,
      time,
      peopleCount,
      rentalNeeded,
      session, // ★ 追加
    });
    setReserveStep("confirm");
  };

  // 確認画面で「この内容で予約する」
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
      session, // ★ 追加
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
        session,                     // ★ 追加：午前の部 / 午後の部
        checkedIn: false,
        userId: user ? user.uid : null,
        createdAt: serverTimestamp(),
      });

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

      // カレンダー表示用 state にも反映（人数も反映）
      setReservationsByDate((prev) => {
        const prevList = prev[date] || [];
        return {
          ...prev,
          [date]: [
            ...prevList,
            {
              id: docRef.id,
              groupName: groupName,
              time: time,
              peopleCount: peopleCount,
              session: session,   // ★ 午前の部 / 午後の部
            },
          ],
        };
      });

      // 後片付け
      sessionStorage.removeItem("reserveDate");
      setReserveData(null);
      setReserveStep("form");
      window.location.href = "/";
    } catch (error) {
      console.error("予約登録エラー:", error);
      alert("予約の登録に失敗しました: " + error.message);
    }
  };

  // 管理者画面：予約削除
  const handleDeleteReservation = async (id) => {
    const ok = window.confirm("この予約を削除してよろしいですか？");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "reservations", id));

      // 管理画面の一覧から削除
      setAdminReservations((prev) => prev.filter((r) => r.id !== id));

      // カレンダー表示用のデータからも削除
      setReservationsByDate((prev) => {
        const newMap = { ...prev };
        for (const date in newMap) {
          newMap[date] = newMap[date].filter((r) => r.id !== id);
          if (newMap[date].length === 0) {
            delete newMap[date];
          }
        }
        return newMap;
      });
    } catch (error) {
      console.error("予約削除エラー:", error);
      alert("予約の削除に失敗しました: " + error.message);
    }
  };

  // ★ 管理者画面：営業時間の保存
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

  // 管理者画面：チェックイン状態のトグル
  const handleToggleCheckIn = async (id, currentCheckedIn) => {
    try {
      // Firestore の値を反転
      await updateDoc(doc(db, "reservations", id), {
        checkedIn: !currentCheckedIn,
      });

      // 管理画面の一覧を更新
      setAdminReservations((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, checkedIn: !currentCheckedIn } : r
        )
      );

      // カレンダー表示用のデータも更新
      setReservationsByDate((prev) => {
        const newMap = { ...prev };
        for (const date in newMap) {
          newMap[date] = newMap[date].map((item) =>
            item.id === id
              ? { ...item, checkedIn: !currentCheckedIn }
              : item
          );
        }
        return newMap;
      });
    } catch (error) {
      console.error("チェックイン更新エラー:", error);
      alert("チェックイン状態の更新に失敗しました: " + error.message);
    }
  };

  // 確認画面で「内容を修正する」
  const handleBackToReservationForm = () => {
    setReserveStep("form");
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay(); // 0:日〜6:土

    const days = [];
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const formatDateKey = (year, month, day) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const getReservationsForDate = (dateKey) => {
    return reservationsByDate[dateKey] || [];
  };

  const selectedReservations =
    selectedDate != null ? getReservationsForDate(selectedDate) : [];

  const monthLabel = `${currentYear}年 ${currentMonth + 1}月`;

  // 予約ボタンが押されたときの処理（ログイン画面へ遷移）
  const handleReserveClick = () => {
    if (!selectedDate) {
      alert("日付を選択してください。");
      return;
    }

    sessionStorage.setItem("reserveDate", selectedDate);
    window.location.href = "/login";
  };

  // 背景スライドショー
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const intervalMs = 8000;
    const fadeMs = 1000;

    const intervalId = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        setCurrentImageIndex((prev) => {
          let next = Math.floor(Math.random() * images.length);
          if (images.length > 1 && next === prev) {
            next = (next + 1) % images.length;
          }
          return next;
        });
        setIsVisible(true);
      }, fadeMs);
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [images.length]);

  // 管理者画面用：予約一覧を取得
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
            checkedIn: data.checkedIn || false,  // 未設定なら false 扱い
            session: data.session || "",        // ★ 追加：午前の部 / 午後の部
          };
        });

        list.sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );

        setAdminReservations(list);
      } catch (error) {
        console.error("管理者予約一覧取得エラー:", error);
      }
    };

    fetchAdminReservations();
  }, [isAdminPage]);

  // ★ 管理者画面用：営業時間を Firestore から読み込む
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
          // まだ設定がなければデフォルトのまま
          console.log("businessHours 設定がまだありません");
        }
      } catch (error) {
        console.error("営業時間設定の取得エラー:", error);
      }
    };

    fetchBusinessHours();
  }, [isAdminPage]);

  // ★ 管理者画面：検索フィルタ済みの配列
  const filteredAdminReservations = adminReservations.filter((r) => {
    // 何も入力されていなければ全件表示
    if (!adminSearchTerm) return true;

    const keyword = adminSearchTerm.toLowerCase();

    const name = (r.name || "").toLowerCase();
    const email = (r.email || "").toLowerCase();
    const team = (r.team || "").toLowerCase();
    const date = (r.date || "").toLowerCase();
    const time = (r.time || "").toLowerCase();

    // 部分一致（名前 / メール / チーム名 / 日付 / 時間）
    return (
      name.includes(keyword) ||
      email.includes(keyword) ||
      team.includes(keyword) ||
      date.includes(keyword) ||
      time.includes(keyword)
    );
  });

  // ★ 予約サマリー（件数・チェックイン数・人数合計）
  const adminTotalCount = filteredAdminReservations.length;
  const adminCheckedInCount = filteredAdminReservations.filter(
    (r) => r.checkedIn
  ).length;
  const adminTotalPeople = filteredAdminReservations.reduce(
    (sum, r) => sum + (r.peopleCount || 0),
    0
  );

   // ★ 管理者テーブルの列幅（共通設定）
   const adminColumnStyle = {
    time:  { width: "12%", textAlign: "left",  padding: "4px 6px" },
    team:  { width: "18%", textAlign: "left",  padding: "4px 6px" },
    name:  { width: "14%", textAlign: "left",  padding: "4px 6px" },
    email: { width: "26%", textAlign: "left",  padding: "4px 6px" },
    people:{ width: "8%",  textAlign: "right", padding: "4px 6px", whiteSpace: "nowrap" },
    status:{ width: "10%", textAlign: "left",  padding: "4px 6px" },
    actions:{ width: "12%", textAlign: "left", padding: "4px 6px", whiteSpace: "nowrap" },
  };

  // ★ 日付ごとに予約をまとめる
  const groupedAdminReservations = useMemo(() => {
    const groups = {};

    filteredAdminReservations.forEach((r) => {
      if (!groups[r.date]) {
        groups[r.date] = [];
      }
      groups[r.date].push(r);
    });

    return Object.entries(groups)
      .sort(([d1], [d2]) => d1.localeCompare(d2)) // 日付順に並べる
      .map(([date, list]) => ({
        date,
        list: list.sort((a, b) => a.time.localeCompare(b.time)), // 時間順
      }));
  }, [filteredAdminReservations]);

  // Firestore から予約一覧を読み込む（カレンダー表示用）
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const reservationsRef = collection(db, "reservations");
        const snapshot = await getDocs(reservationsRef);

        const map = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const date = data.date;
          const team = data.team;
          const time = data.time;
          const peopleCount = data.peopleCount;
          const session = data.session || "";   // ★ 午前の部 / 午後の部

          if (!map[date]) {
            map[date] = [];
          }

          map[date].push({
            id: docSnap.id,
            groupName: team,
            time: time,
            peopleCount: peopleCount,
            session: session,                  // ★ 追加
          });
        });

        setReservationsByDate(map);
      } catch (error) {
        console.error("予約データ取得エラー:", error);
      }
    };

    fetchReservations();
  }, []);

  // 予約フォームで使う日付（あれば初期値として表示）
  const reservedDate = sessionStorage.getItem("reserveDate") || "";

  // 右側パネルの中身（カレンダー画面用）
  let detailContent;
  if (selectedDate == null) {
    detailContent = h(
      "p",
      { className: "detail-placeholder" },
      "カレンダーの日付をクリックすると、予約の詳細が表示されます。"
    );
  } else if (selectedReservations.length === 0) {
    detailContent = h(
      "p",
      { className: "detail-placeholder" },
      selectedDate + " の予約はまだありません。"
    );
  } else {
    // ★ 午前の部 / 午後の部 / その他 に分割
    const amReservations = selectedReservations.filter(
      (r) => r.session === "午前の部"
    );
    const pmReservations = selectedReservations.filter(
      (r) => r.session === "午後の部"
    );
    const otherReservations = selectedReservations.filter(
      (r) => !r.session || (r.session !== "午前の部" && r.session !== "午後の部")
    );

    const renderList = (list) =>
      h(
        "ul",
        { className: "reservation-list" },
        list.map((r) =>
          h(
            "li",
            { key: r.id, className: "reservation-item" },
            h(
              "div",
              { className: "reservation-group" },
              r.peopleCount != null
                ? `${r.groupName}（${r.peopleCount}名）`
                : r.groupName
            ),
            h(
              "div",
              { className: "reservation-time" },
              r.time
            )
          )
        )
      );

    detailContent = h(
      "div",
      null,
      // 午前の部
      amReservations.length > 0 &&
        h(
          "div",
          { className: "session-block" },
          h(
            "h3",
            { className: "detail-session-title" },
            "午前の部（9:00〜11:00）"
          ),
          renderList(amReservations)
        ),
      // 午後の部
      pmReservations.length > 0 &&
        h(
          "div",
          { className: "session-block" },
          h(
            "h3",
            { className: "detail-session-title" },
            "午後の部（13:00〜16:00）"
          ),
          renderList(pmReservations)
        ),
      // その他（古いデータなど session がないもの）
      otherReservations.length > 0 &&
        h(
          "div",
          { className: "session-block" },
          h(
            "h3",
            { className: "detail-session-title" },
            "その他"
          ),
          renderList(otherReservations)
        )
    );
  }

  // 画面切り替え
  let mainContent;

  if (isLoginPage) {
    // ログイン画面
    mainContent = h(
      "div",
      { className: "app" },
      h(
        "div",
        { className: "login-page" },
        h(
          "div",
          { className: "login-card" },
          h("h1", { className: "login-title" }, "SURE SHOT"),
          h(
            "p",
            { className: "login-subtitle" },
            "予約するにはログインしてください"
          ),
          h(
            "form",
            { className: "login-form", onSubmit: handleLoginSubmit },
            h(
              "label",
              { className: "login-label" },
              "メールアドレス",
              h("input", {
                className: "login-input",
                type: "email",
                name: "email",
                placeholder: "you@example.com",
                required: true,
              })
            ),
            h(
              "label",
              { className: "login-label" },
              "パスワード",
              h("input", {
                className: "login-input",
                type: "password",
                name: "password",
                placeholder: "********",
                required: true,
              })
            ),
            h(
              "button",
              { className: "login-button", type: "submit" },
              "ログイン"
            )
          ),
          h(
            "button",
            {
              type: "button",
              className: "signup-button",
              onClick: () => {
                window.location.href = "/signup";
              },
            },
            "新規登録"
          ),
          h(
            "button",
            {
              type: "button",
              className: "login-back-button",
              onClick: () => {
                window.location.href = "/";
              },
            },
            "← カレンダーに戻る"
          )
        )
      )
    );
  } else if (isSignupPage) {
    // 新規登録画面
    mainContent = h(
      "div",
      { className: "app" },
      h(
        "div",
        { className: "login-page" },
        h(
          "div",
          { className: "login-card" },
          h("h1", { className: "login-title" }, "SURE SHOT"),
          h(
            "p",
            { className: "login-subtitle" },
            "アカウントを作成して予約を開始しましょう"
          ),
          h(
            "form",
            { className: "login-form", onSubmit: handleSignupSubmit },
            h(
              "label",
              { className: "login-label" },
              "メールアドレス",
              h("input", {
                className: "login-input",
                type: "email",
                name: "email",
                placeholder: "you@example.com",
                required: true,
              })
            ),
            h(
              "label",
              { className: "login-label" },
              "パスワード",
              h("input", {
                className: "login-input",
                type: "password",
                name: "password",
                placeholder: "********",
                required: true,
              })
            ),
            h(
              "label",
              { className: "login-label" },
              "パスワード（確認）",
              h("input", {
                className: "login-input",
                type: "password",
                name: "confirm",
                placeholder: "********",
                required: true,
              })
            ),
            h(
              "button",
              { className: "login-button", type: "submit" },
              "新規登録"
            )
          ),
          h(
            "button",
            {
              type: "button",
              className: "login-back-button",
              onClick: () => {
                window.location.href = "/login";
              },
            },
            "← ログイン画面に戻る"
          )
        )
      )
    );
  } else if (isReservePage) {
    // 予約フォーム or 確認画面
    const initialName = reserveData ? reserveData.name : "";
    const initialEmail = reserveData ? reserveData.email : "";
    const initialGroupName = reserveData ? reserveData.groupName : "";
    const initialDate = reserveData ? reserveData.date : reservedDate;
    const initialTime = reserveData ? reserveData.time : "";
    const initialPeopleCount = reserveData ? reserveData.peopleCount : "";
    const initialRentalNeeded = reserveData
      ? reserveData.rentalNeeded
      : null;

    if (reserveStep === "confirm" && reserveData) {
      // 確認画面
      mainContent = h(
        "div",
        { className: "app" },
        h(
          "div",
          { className: "login-page" },
          h(
            "div",
            { className: "login-card" },
            h("h1", { className: "login-title" }, "予約内容の確認"),
            h(
              "p",
              { className: "login-subtitle" },
              "以下の内容で予約してよろしいですか？"
            ),
            h(
              "div",
              { className: "reserve-summary" },
              // 名前
              h(
                "div",
                { className: "reserve-summary-row" },
                h("span", { className: "reserve-summary-label" }, "名前"),
                h(
                  "span",
                  { className: "reserve-summary-value" },
                  reserveData.name
                )
              ),
              // メール
              h(
                "div",
                { className: "reserve-summary-row" },
                h("span", { className: "reserve-summary-label" }, "メール"),
                h(
                  "span",
                  { className: "reserve-summary-value" },
                  reserveData.email
                )
              ),
              // チーム名
              h(
                "div",
                { className: "reserve-summary-row" },
                h(
                  "span",
                  { className: "reserve-summary-label" },
                  "参加チーム名"
                ),
                h(
                  "span",
                  { className: "reserve-summary-value" },
                  reserveData.groupName
                )
              ),
              // 人数
              h(
                "div",
                { className: "reserve-summary-row" },
                h("span", { className: "reserve-summary-label" }, "人数"),
                h(
                  "span",
                  { className: "reserve-summary-value" },
                  reserveData.peopleCount + " 名"
                )
              ),
              // レンタル装備
              h(
                "div",
                { className: "reserve-summary-row" },
                h(
                  "span",
                  { className: "reserve-summary-label" },
                  "レンタル装備"
                ),
                h(
                  "span",
                  { className: "reserve-summary-value" },
                  reserveData.rentalNeeded ? "必要" : "不要"
                )
              ),
              // ★ 参加区分（午前の部 / 午後の部）
              h(
                "div",
                { className: "reserve-summary-row" },
                h("span", { className: "reserve-summary-label" }, "参加区分"),
                h(
                  "span",
                  { className: "reserve-summary-value" },
                  reserveData.session
                )
              ),
              // 日付
              h(
                "div",
                { className: "reserve-summary-row" },
                h("span", { className: "reserve-summary-label" }, "日付"),
                h(
                  "span",
                  { className: "reserve-summary-value" },
                  reserveData.date
                )
              ),
              // 時間
              h(
                "div",
                { className: "reserve-summary-row" },
                h("span", { className: "reserve-summary-label" }, "時間"),
                h(
                  "span",
                  { className: "reserve-summary-value" },
                  reserveData.time
                )
              )
            ),
            h(
              "div",
              { className: "reserve-actions" },
              h(
                "button",
                {
                  type: "button",
                  className: "reserve-edit-button",
                  onClick: handleBackToReservationForm,
                },
                "内容を修正する"
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "reserve-confirm-button",
                  onClick: handleConfirmReservation,
                },
                "この内容で予約する"
              )
            ),
            h(
              "button",
              {
                type: "button",
                className: "login-back-button",
                onClick: () => {
                  window.location.href = "/";
                },
              },
              "← カレンダーに戻る"
            )
          )
        )
      );
    } else {
      // 入力フォーム画面
      mainContent = h(
        "div",
        { className: "app" },
        h(
          "div",
          { className: "login-page" },
          h(
            "div",
            { className: "login-card" },
            h("h1", { className: "login-title" }, "予約フォーム"),
            h(
              "p",
              { className: "login-subtitle" },
              "以下の内容を入力して予約内容を確認してください"
            ),
            h(
              "form",
              { className: "login-form", onSubmit: handleReservationSubmit },
              // 名前
              h(
                "label",
                { className: "login-label" },
                "名前",
                h("input", {
                  className: "login-input",
                  type: "text",
                  name: "name",
                  placeholder: "例）山田 太郎",
                  defaultValue: initialName,
                  required: true,
                })
              ),
              // メールアドレス
              h(
                "label",
                { className: "login-label" },
                "メールアドレス",
                h("input", {
                  className: "login-input",
                  type: "email",
                  name: "email",
                  placeholder: "you@example.com",
                  defaultValue: initialEmail,
                  required: true,
                })
              ),
              // 参加チーム名
              h(
                "label",
                { className: "login-label" },
                "参加チーム名",
                h("input", {
                  className: "login-input",
                  type: "text",
                  name: "groupName",
                  placeholder: "例）Red team",
                  defaultValue: initialGroupName,
                  required: true,
                })
              ),
              // 人数
              h(
                "label",
                { className: "login-label" },
                "人数",
                h("input", {
                  className: "login-input",
                  type: "number",
                  name: "peopleCount",
                  min: 1,
                  step: 1,
                  placeholder: "例）5",
                  defaultValue: initialPeopleCount,
                  required: true,
                })
              ),
              // レンタル装備
              h(
                "label",
                { className: "login-label" },
                "レンタル装備",
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      gap: "12px",
                      marginTop: "4px",
                    },
                  },
                  h(
                    "label",
                    {
                      style: {
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      },
                    },
                    h("input", {
                      type: "radio",
                      name: "rentalNeeded",
                      value: "yes",
                      defaultChecked:
                        initialRentalNeeded === true ? true : false,
                      required: true,
                    }),
                    "必要"
                  ),
                  h(
                    "label",
                    {
                      style: {
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      },
                    },
                    h("input", {
                      type: "radio",
                      name: "rentalNeeded",
                      value: "no",
                      defaultChecked:
                        initialRentalNeeded === false || initialRentalNeeded === null
                          ? true
                          : false,
                    }),
                    "不要"
                  )
                )
              ),
              // 日付
              h(
                "label",
                { className: "login-label" },
                "日付",
                h("input", {
                  className: "login-input",
                  type: "date",
                  name: "date",
                  defaultValue: initialDate,
                  required: true,
                })
              ),
              // 時間
              h(
                "label",
                { className: "login-label" },
                "時間",
                h("input", {
                  className: "login-input",
                  type: "time",
                  name: "time",
                  defaultValue: initialTime,
                  required: true,
                })
              ),
              h(
                "button",
                { className: "login-button", type: "submit" },
                "予約内容を確認する"
              )
            ),
            h(
              "button",
              {
                type: "button",
                className: "login-back-button",
                onClick: () => {
                  window.location.href = "/";
                },
              },
              "← カレンダーに戻る"
            )
          )
        )
      );
    }
  } else if (isAdminPage) {
    // 管理者画面
    mainContent = h(
      "div",
      { className: "app" },
      h(
        "div",
        { className: "login-page" },
        h(
          "div",
          { className: "login-card" },
          h("h1", { className: "login-title" }, "予約一覧（管理者）"),
          h(
            "p",
            { className: "login-subtitle" },
            "予約の検索・チェックイン・削除ができます"
          ),

          // ★ 営業時間設定パネル（ここを追加）
          h(
            "div",
            {
              style: {
                marginBottom: "12px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #29593A",
                background: "rgba(4, 24, 14, 0.95)",
                fontSize: "12px",
              },
            },
            [
              h(
                "div",
                {
                  key: "title",
                  style: {
                    marginBottom: "6px",
                    fontWeight: "600",
                    color: "#A9D9A7",
                  },
                },
                "営業時間設定"
              ),
              h(
                "div",
                {
                  key: "fields",
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  },
                },
                [
                  h(
                    "label",
                    {
                      key: "open",
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      },
                    },
                    [
                      h(
                        "span",
                        { style: { minWidth: "56px" } },
                        "開店"
                      ),
                      h("input", {
                        type: "time",
                        value: businessOpenTime,
                        onChange: (e) =>
                          setBusinessOpenTime(e.target.value),
                        style: {
                          padding: "4px 6px",
                          backgroundColor: "#02150e",
                          border: "1px solid #1f5a33",
                          color: "#E5F7E0",
                          borderRadius: "4px",
                          fontSize: "12px",
                        },
                      }),
                    ]
                  ),
                  h(
                    "label",
                    {
                      key: "close",
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      },
                    },
                    [
                      h(
                        "span",
                        { style: { minWidth: "56px" } },
                        "閉店"
                      ),
                      h("input", {
                        type: "time",
                        value: businessCloseTime,
                        onChange: (e) =>
                          setBusinessCloseTime(e.target.value),
                        style: {
                          padding: "4px 6px",
                          backgroundColor: "#02150e",
                          border: "1px solid #1f5a33",
                          color: "#E5F7E0",
                          borderRadius: "4px",
                          fontSize: "12px",
                        },
                      }),
                    ]
                  ),
                  h(
                    "button",
                    {
                      key: "save",
                      type: "button",
                      onClick: handleSaveBusinessHours,
                      disabled: businessHoursSaving,
                      style: {
                        padding: "6px 12px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        border: "1px solid #2DD66B",
                        background: "rgba(5, 36, 19, 0.95)",
                        color: "#CFFFE1",
                        cursor: "pointer",
                        marginLeft: "4px",
                      },
                    },
                    businessHoursSaving ? "保存中..." : "保存する"
                  ),
                ]
              ),
              h(
                "div",
                {
                  key: "note",
                  style: {
                    marginTop: "4px",
                    color: "#7BAF7E",
                    fontSize: "11px",
                  },
                },
                "※ 現在は予約フォームの時間制限には未反映（次のステップで反映可能）"
              ),
            ]
          ),


          // 🔍 検索ボックス
          h(
            "div",
            {
              style: {
                marginBottom: "12px",
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
              },
            },
            h("input", {
              type: "text",
              placeholder: "名前 / メール / チーム名 / 日付 で検索...",
              value: adminSearchTerm,
              onChange: (e) => setAdminSearchTerm(e.target.value),
              style: {
                padding: "6px 10px",
                fontSize: "12px",
                minWidth: "200px",
                flex: "1 1 220px",
                backgroundColor: "#021b12",
                border: "1px solid #1f5a33",
                color: "#A9D9A7",
              },
            })
          ),

          // 📊 サマリー表示
          h(
            "div",
            {
              style: {
                display: "flex",
                gap: "8px",
                marginBottom: "8px",
                flexWrap: "wrap",
              },
            },
            [
              h(
                "div",
                {
                  key: "summary-total",
                  style: {
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid #29593A",
                    fontSize: "11px",
                    color: "#A9D9A7",
                    backgroundColor: "#02150e",
                  },
                },
                `予約件数: ${adminTotalCount}件`
              ),
              h(
                "div",
                {
                  key: "summary-checked",
                  style: {
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid #29593A",
                    fontSize: "11px",
                    color: "#A9D9A7",
                    backgroundColor: "#02150e",
                  },
                },
                `チェックイン済: ${adminCheckedInCount}件`
              ),
              h(
                "div",
                {
                  key: "summary-people",
                  style: {
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid #29593A",
                    fontSize: "11px",
                    color: "#A9D9A7",
                    backgroundColor: "#02150e",
                  },
                },
                `合計人数: ${adminTotalPeople}名`
              ),
            ]
          ),

          // 📋 予約一覧リスト（カード表示）
          h(
            "div",
            { style: { maxHeight: "70vh", overflowY: "auto" } },
            groupedAdminReservations.length === 0
              ? h(
                  "div",
                  {
                    style: {
                      padding: "8px 6px",
                      textAlign: "center",
                      color: "#A9D9A7",
                      fontSize: "12px",
                    },
                  },
                  "該当する予約がありません"
                )
              : groupedAdminReservations.map((group) => {
                  // ★ この日の合計人数を計算
                  const groupTotalPeople = group.list.reduce(
                    (sum, r) => sum + (r.peopleCount || 0),
                    0
                  );

                  return h(
                    "div",
                    { key: group.date, style: { marginBottom: "14px" } },

                    // ★ 日付ラベル＋日別合計人数の表示
                    h(
                      "div",
                      {
                        style: {
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#CFFFE1",
                          borderLeft: "3px solid #3EF68A",
                          paddingLeft: "8px",
                          marginBottom: "4px",
                        },
                      },
                      `${group.date}（合計 ${groupTotalPeople}名）`
                    ),

                    // ★ この日付の中だけのテーブル（1個だけ！）
                    h(
                      "table",
                      {
                        style: {
                          width: "100%",
                          fontSize: "12px",
                          borderCollapse: "collapse",
                          backgroundColor: "rgba(2,21,14,0.9)",
                          borderRadius: "6px",
                          overflow: "hidden",
                        },
                      },
                      h(
                        "thead",
                        null,
                        h(
                          "tr",
                          null,
                          h(
                            "th",
                            {
                              style: {
                                borderBottom: "1px solid #29593A",
                                padding: "4px 6px",
                                textAlign: "left",
                                color: "#A9D9A7",
                              },
                            },
                            "時間"
                          ),
                          h(
                            "th",
                            {
                              style: {
                                borderBottom: "1px solid #29593A",
                                padding: "4px 6px",
                                textAlign: "left",
                                color: "#A9D9A7",
                              },
                            },
                            "チーム名"
                          ),
                          h(
                            "th",
                            {
                              style: {
                                borderBottom: "1px solid #29593A",
                                padding: "4px 6px",
                                textAlign: "left",
                                color: "#A9D9A7",
                              },
                            },
                            "名前"
                          ),
                          h(
                            "th",
                            {
                              style: {
                                borderBottom: "1px solid #29593A",
                                padding: "4px 6px",
                                textAlign: "left",
                                color: "#A9D9A7",
                              },
                            },
                            "メール"
                          ),
                          h(
                            "th",
                            {
                              style: {
                                borderBottom: "1px solid #29593A",
                                padding: "4px 6px",
                                textAlign: "right",
                                color: "#A9D9A7",
                              },
                            },
                            "人数"
                          ),
                          h(
                            "th",
                            {
                              style: {
                                borderBottom: "1px solid #29593A",
                                padding: "4px 6px",
                                textAlign: "left",
                                color: "#A9D9A7",
                              },
                            },
                            "状態"
                          ),
                          h(
                            "th",
                            {
                              style: {
                                borderBottom: "1px solid #29593A",
                                padding: "4px 6px",
                                textAlign: "left",
                                color: "#A9D9A7",
                              },
                            },
                            "操作"
                          )
                        )
                      ),
                      h(
                        "tbody",
                        null,
                        group.list.map((r, index) => {
                          const rowBg = r.checkedIn
                            ? "#062917"
                            : index % 2 === 0
                            ? "#02150e"
                            : "transparent";

                          return h(
                            "tr",
                            { key: r.id, style: { backgroundColor: rowBg } },
                            h(
                              "td",
                              { style: { padding: "4px 6px" } },
                              r.session ? `${r.time}（${r.session}）` : r.time
                            ),
                            h(
                              "td",
                              { style: { padding: "4px 6px", fontWeight: "bold" } },
                              r.team
                            ),
                            h("td", { style: { padding: "4px 6px" } }, r.name),
                            h(
                              "td",
                              {
                                style: {
                                  padding: "4px 6px",
                                  maxWidth: "180px",
                                  wordBreak: "break-all",
                                },
                              },
                              r.email
                            ),
                            h(
                              "td",
                              {
                                style: {
                                  padding: "4px 6px",
                                  textAlign: "right",
                                  whiteSpace: "nowrap",
                                },
                              },
                              r.peopleCount ? `${r.peopleCount}名` : "-"
                            ),
                            h(
                              "td",
                              { style: { padding: "4px 6px" } },
                              r.checkedIn
                                ? h(
                                    "span",
                                    { className: "status-badge checked" },
                                    "チェックイン済"
                                  )
                                : h(
                                    "span",
                                    { className: "status-badge" },
                                    "未チェックイン"
                                  )
                            ),
                            h(
                              "td",
                              { style: { padding: "4px 6px", whiteSpace: "nowrap" } },
                              h(
                                "button",
                                {
                                  className: "reserve-edit-button",
                                  type: "button",
                                  onClick: () =>
                                    handleToggleCheckIn(r.id, r.checkedIn),
                                  style: { marginRight: "6px" },
                                },
                                r.checkedIn ? "戻す" : "チェックイン"
                              ),
                              h(
                                "button",
                                {
                                  className: "reserve-edit-button",
                                  type: "button",
                                  onClick: () => handleDeleteReservation(r.id),
                                },
                                "削除"
                              )
                            )
                          );
                        })
                      )
                    )
                  );
                })
          ),

          h(
            "button",
            {
              type: "button",
              className: "login-back-button",
              onClick: () => {
                window.location.href = "/";
              },
            },
            "← カレンダーに戻る"
          )
        )
      )
    );
  } else {
    // カレンダー画面
    mainContent = h(
      "div",
      { className: "app" },

      h(
        "header",
        { className: "app-header" },
        h("h1", { className: "app-title" }, "SURE SHOT"),
        h("p", { className: "app-subtitle" }, "サバゲーフィールドシュアショット")
      ),

      h(
        "div",
        { className: "calendar-container" },
        h(
          "div",
          { className: "calendar-panel" },
          h(
            "div",
            { className: "calendar-header" },
            h(
              "button",
              { className: "nav-button", onClick: handlePrevMonth },
              "←"
            ),
            h("div", { className: "month-label" }, monthLabel),
            h(
              "button",
              { className: "nav-button", onClick: handleNextMonth },
              "→"
            )
          ),
          h(
            "div",
            { className: "weekday-row" },
            ["日", "月", "火", "水", "木", "金", "土"].map((w) =>
              h(
                "div",
                {
                  key: w,
                  className: "weekday-cell",
                },
                w
              )
            )
          ),
          h(
            "div",
            { className: "days-grid" },
            calendarDays.map((day, index) => {
              if (day === null) {
                return h("div", {
                  key: index,
                  className: "day-cell empty",
                });
              }

              const dateKey = formatDateKey(currentYear, currentMonth, day);
              const reservations = getReservationsForDate(dateKey);
              const isSelected = selectedDate === dateKey;

              let className = "day-cell";
              if (isSelected) className += " selected";
              if (reservations.length > 0) className += " has-reservation";

              const groupTagChildren = [];

              reservations.slice(0, 2).forEach((r) => {
                groupTagChildren.push(
                  h(
                    "span",
                    { key: r.id, className: "group-tag" },
                    r.peopleCount != null
                      ? `${r.groupName}（${r.peopleCount}名）`
                      : r.groupName
                  )
                );
              });

              if (reservations.length > 2) {
                groupTagChildren.push(
                  h(
                    "span",
                    {
                      key: "more-" + dateKey,
                      className: "group-tag more",
                    },
                    "+" + (reservations.length - 2) + "件"
                  )
                );
              }

              return h(
                "button",
                {
                  key: index,
                  className,
                  onClick: function () {
                    setSelectedDate(dateKey);
                  },
                },
                h("div", { className: "day-number" }, day),
                h("div", { className: "group-tags" }, groupTagChildren)
              );
            })
          )
        ),
        h(
          "div",
          { className: "detail-panel" },
          h("h2", { className: "detail-title" }, "参加予定チーム"),
          detailContent,
          // 下部に「合計人数 ＋ 予約ボタン」
          h(
            "div",
            { className: "detail-footer" },
            // 左側：選択日の合計人数
            selectedDate && selectedReservations.length > 0
              ? h(
                  "div",
                  { className: "total-people" },
                  `合計人数: ${
                    selectedReservations.reduce(
                      (sum, r) => sum + (r.peopleCount != null ? r.peopleCount : 0),
                      0
                    )
                  }名`
                )
              : h("div", { className: "total-people" }, ""),
            // 右側：予約ボタン
            h(
              "button",
              {
                className: "reserve-button",
                onClick: handleReserveClick,
                disabled: !selectedDate,
              },
              "予約する"
            )
          )
        )
      ),
      // Google Map
      h(
        "div",
        { style: { marginTop: "20px" } },
        h(
          "div",
          { className: "military-map-frame" },
          h("iframe", {
            src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2619.469799298635!2d135.1648477!3d34.9650719!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60006e384e53c94b%3A0xb0ee221fd1b38517!2z44K144OQ44Ky44O844OV44Kj44O844Or44OJ44K344Ol44Ki44K344On44OD44OI!5e0!3m2!1sja!2sjp!4v1700000000000!5m2!1sja!2sjp",
            width: "100%",
            height: "300",
            style: {
              border: "0",
            },
            allowFullScreen: "",
            loading: "lazy",
            referrerPolicy: "no-referrer-when-downgrade",
          })
        )
      )
    );
  }

  return h(
    "div",
    { className: "app-root app" },

    // ★ 左上の MFD風メニュー
    h(
      "div",
      { className: "floating-dropdown-wrapper", ref: menuRef },
      [
        // MENU ボタン（押すと開閉）
        h(
          "button",
          {
            className: "floating-menu-button",
            type: "button",
            onClick: (e) => {
              e.stopPropagation();          // 自分のクリックで即閉じないように
              setIsMenuOpen((prev) => !prev);
            },
          },
          "MENU"
        ),
        // スライドして出てくるパネル
        h(
          "div",
          {
            className:
              "floating-menu-panel" + (isMenuOpen ? " open" : ""),
            onClick: (e) => e.stopPropagation(), // 中をクリックしても閉じないように
          },
          [
            h(
              "button",
              {
                key: "top",
                className: "floating-menu-item",
                type: "button",
                onClick: () => {
                  setIsMenuOpen(false);
                  window.location.href = "/";
                },
              },
              "TOP"
            ),
            h(
              "button",
              {
                key: "login",
                className: "floating-menu-item",
                type: "button",
                onClick: () => {
                  setIsMenuOpen(false);
                  window.location.href = "/login";
                },
              },
              "LOGIN"
            ),
          ]
        ),
      ]
    ),

    // 背景画像
    h("img", {
      src: images[currentImageIndex],
      className: "bg-slide-image",
      style: {
        opacity: isVisible ? 0.15 : 0,
      },
      alt: "background slide",
    }),

    // 画面本体
    mainContent
  );
}

export default App;