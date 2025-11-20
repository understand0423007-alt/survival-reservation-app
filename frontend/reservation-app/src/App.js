import React, { useState, useMemo, useEffect } from "react";
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
} from "firebase/firestore";

function App() {
  // state ロジック
  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(10); // 0=Jan, 10=Nov
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"

  // 管理者画面用：予約一覧
  const [adminReservations, setAdminReservations] = useState([]);

  // Firestore から読み込んだ予約データ { "YYYY-MM-DD": [{ id, groupName, time }, ...] }
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
  const [reserveData, setReserveData] = useState(null); // { name, email, groupName, date, time }

  // ログインフォーム送信時の処理（本物）
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
      // Firebase Authentication でログイン
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("ログインユーザー:", userCredential.user);

      const reservedDate = sessionStorage.getItem("reserveDate");
      console.log("ログイン後に使う日付: ", reservedDate);

      alert(email + " でログインしました。");

      // ログイン完了後は予約フォームへ
      window.location.href = "/reserve";
    } catch (error) {
      console.error("ログインエラー:", error);
      alert("ログインに失敗しました: " + error.message);
    }
  };

  // 新規登録フォーム送信時の処理（本物）
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

      // 登録完了後はログイン画面へ
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

  // 予約フォーム送信時の処理（確認画面へ進む）
  const handleReservationSubmit = (event) => {
    event.preventDefault();
    const form = event.target;

    const name = form.elements.name.value;
    const email = form.elements.email.value;
    const groupName = form.elements.groupName.value;
    const date = form.elements.date.value;
    const time = form.elements.time.value;

    if (!name || !email || !groupName || !date || !time) {
      alert("すべての項目を入力してください。");
      return;
    }

    // 入力内容を state に保存して確認画面へ
    setReserveData({ name, email, groupName, date, time });
    setReserveStep("confirm");
  };

  // 確認画面で「この内容で予約する」が押されたとき
  const handleConfirmReservation = async () => {
    if (!reserveData) return;

    const { name, email, groupName, date, time } = reserveData;

    try {
      const reservationsRef = collection(db, "reservations");

      // ★ 重複チェックは行わず、そのまま追加する
      const user = auth.currentUser;
      const docRef = await addDoc(reservationsRef, {
        name,
        email,
        team: groupName,
        date,
        time,
        userId: user ? user.uid : null,
        createdAt: serverTimestamp(),
      });

      // カレンダー表示用の state にも反映
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
            },
          ],
        };
      });

      alert(
        `予約を受け付けました。\n\n日付: ${date}\n時間: ${time}\nチーム名: ${groupName}\nお名前: ${name}\nメール: ${email}`
      );

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

  // 確認画面で「内容を修正する」が押されたとき
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

    // 1. 選択した日付をログイン後・予約フォームで使うため保存
    sessionStorage.setItem("reserveDate", selectedDate);

    // 2. ログイン画面（/login）へ遷移
    window.location.href = "/login";
  };

  // 現在表示している画像のindex
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // フェード用：true = 表示中 / false = フェードアウト中
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const intervalMs = 8000; // 何秒ごとに画像を切り替えるか
    const fadeMs = 1000; // フェード時間

    const intervalId = setInterval(() => {
      setIsVisible(false); // ① まずフェードアウト

      setTimeout(() => {
        setCurrentImageIndex((prev) => {
          let next = Math.floor(Math.random() * images.length);
          if (images.length > 1 && next === prev) {
            next = (next + 1) % images.length;
          }
          return next;
        });
        setIsVisible(true); // フェードイン
      }, fadeMs);
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [images.length]);

  // 管理者画面用：予約一覧を取得
  useEffect(() => {
    if (!isAdminPage) return; // /admin のときだけ動かす

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
          };
        });

        // 日付 → 時間 の順に並び替え（文字列としてOK）
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

  // Firestore から予約一覧を読み込む（カレンダー表示用）
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const reservationsRef = collection(db, "reservations");
        const snapshot = await getDocs(reservationsRef);

        const map = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const date = data.date; // "YYYY-MM-DD"
          const team = data.team; // チーム名
          const time = data.time; // "HH:MM"

          if (!map[date]) {
            map[date] = [];
          }

          map[date].push({
            id: docSnap.id,
            groupName: team,
            time: time,
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
    detailContent = h(
      "ul",
      { className: "reservation-list" },
      selectedReservations.map((r) =>
        h(
          "li",
          { key: r.id, className: "reservation-item" },
          h("div", { className: "reservation-group" }, r.groupName),
          h("div", { className: "reservation-time" }, r.time)
        )
      )
    );
  }

  // ★ ここで「ログイン / 新規登録 / 予約フォーム / 管理画面 / カレンダー」を分ける
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
          h("h1", { className: "login-title" }, "CQB GHOST"),
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
          // 新規登録へ
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
          // カレンダーに戻る
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
          h("h1", { className: "login-title" }, "CQB GHOST"),
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
          // ログイン画面へ戻る
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
    // 予約フォーム画面 or 確認画面
    // フォームで使う初期値（戻ってきた時は reserveData を優先）
    const initialName = reserveData ? reserveData.name : "";
    const initialEmail = reserveData ? reserveData.email : "";
    const initialGroupName = reserveData ? reserveData.groupName : "";
    const initialDate = reserveData ? reserveData.date : reservedDate; // カレンダーで選んだ日付
    const initialTime = reserveData ? reserveData.time : "";

    if (reserveStep === "confirm" && reserveData) {
      // ★ 確認画面UI
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

            // 内容一覧
            h(
              "div",
              { className: "reserve-summary" },
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

            // ボタン2つ
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

            // カレンダーに戻る（確認画面からでも戻れるように）
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
      // ★ 入力用フォーム画面
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
              // 予約内容確認ボタン
              h(
                "button",
                { className: "login-button", type: "submit" },
                "予約内容を確認する"
              )
            ),
            // カレンダーに戻る
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
    // ★ 管理者用：予約一覧画面
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
            "予約一覧を確認・削除できます"
          ),

          // 一覧テーブル
          h(
            "div",
            { style: { maxHeight: "400px", overflowY: "auto" } },
            h(
              "table",
              {
                style: {
                  width: "100%",
                  fontSize: "12px",
                  borderCollapse: "collapse",
                },
              },
              // ヘッダー
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  ["名前", "メール", "チーム名", "日付", "時間", "操作"].map(
                    (label) =>
                      h(
                        "th",
                        {
                          key: label,
                          style: {
                            borderBottom: "1px solid #29593A",
                            padding: "4px 6px",
                            textAlign: "left",
                            color: "#A9D9A7",
                          },
                        },
                        label
                      )
                  )
                )
              ),
              // 本体
              h(
                "tbody",
                null,
                adminReservations.map((r) =>
                  h(
                    "tr",
                    { key: r.id },
                    h("td", { style: { padding: "4px 6px" } }, r.name),
                    h("td", { style: { padding: "4px 6px" } }, r.email),
                    h("td", { style: { padding: "4px 6px" } }, r.team),
                    h("td", { style: { padding: "4px 6px" } }, r.date),
                    h("td", { style: { padding: "4px 6px" } }, r.time),
                    h(
                      "td",
                      { style: { padding: "4px 6px" } },
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
                  )
                )
              )
            )
          ),

          // カレンダーへ戻るボタン
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
    // カレンダー画面のUI
    mainContent = h(
      "div",
      { className: "app" },

      // ヘッダー
      h(
        "header",
        { className: "app-header" },
        h("h1", { className: "app-title" }, "CQB GHOST"),
        h("p", { className: "app-subtitle" }, "Fukusaski 福崎店")
      ),

      // 2カラムレイアウト全体
      h(
        "div",
        { className: "calendar-container" },

        // 左：カレンダー
        h(
          "div",
          { className: "calendar-panel" },

          // 月切り替えヘッダー
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

          // 曜日
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

          // 日付グリッド
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

              // クラス名組み立て
              let className = "day-cell";
              if (isSelected) className += " selected";
              if (reservations.length > 0) className += " has-reservation";

              // グループタグの子要素を配列で作る
              const groupTagChildren = [];

              reservations.slice(0, 2).forEach((r) => {
                groupTagChildren.push(
                  h(
                    "span",
                    { key: r.id, className: "group-tag" },
                    r.groupName
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

        // 右：詳細パネル
        h(
          "div",
          { className: "detail-panel" },
          h("h2", { className: "detail-title" }, "参加予定チーム"),
          detailContent,
          // 右下に「予約する」ボタン
          h(
            "div",
            { className: "detail-footer" },
            h(
              "button",
              {
                className: "reserve-button",
                onClick: handleReserveClick,
                disabled: !selectedDate, // 日付が未選択のときは押せないように
              },
              "予約する"
            )
          )
        )
      )
    );
  }

  // ★ UI 全体（背景 + 各画面）
  return h(
    "div",
    { className: "app-root app" },

    // 最背面の背景画像
    h("img", {
      src: images[currentImageIndex],
      className: "bg-slide-image",
      style: {
        opacity: isVisible ? 0.15 : 0,
      },
      alt: "background slide",
    }),

    // メインコンテンツ（ログイン / 新規登録 / 予約フォーム / 管理画面 / カレンダー）
    mainContent
  );
}

export default App;
