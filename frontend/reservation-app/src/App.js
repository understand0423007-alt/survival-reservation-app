import React, { useState, useMemo, useEffect } from "react";
import "./App.css";

// 仮の予約データ（あとでAPIやFirebaseとつなぐときに差し替え）
const sampleReservations = {
  "2025-11-03": [
    { id: 1, groupName: "Red team", time: "10:00" },
    { id: 2, groupName: "Blue team", time: "11:00" },
    { id: 3, groupName: "Green team", time: "13:00" },
  ],
  "2025-11-05": [{ id: 4, groupName: "Yellow Hawks", time: "09:00" }],
  "2025-11-10": [
    { id: 5, groupName: "Black Wolves", time: "14:00" },
    { id: 6, groupName: "White Rabbits", time: "15:00" },
  ],
  "2025-11-11": [
    { id: 7, groupName: "aaeaaieajoooooooooooo", time: "16:00" }
  ]
};

function App() {
  // state ロジック
  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(10); // 0=Jan, 10=Nov
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"
  
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
  
  // ログイン画面かどうか
  const isLoginPage = window.location.pathname === "/login";

  // ログインフォーム送信時の処理（仮）
  const handleLoginSubmit = (event) => {
    event.preventDefault();
    const form = event.target;
    const email = form.elements.email.value;
    const password = form.elements.password.value;

    // TODO: 実際はここでAPIに投げる
    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください。");
      return;
    }

    alert("仮ログイン完了: " + email + " でログインしました。");

    // ログイン完了後はカレンダーに戻す例
    window.location.href = "/";
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
    return sampleReservations[dateKey] || [];
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

    // 1. 選択した日付をログイン後に使いたければ、一時的に保存しておく
    sessionStorage.setItem("reserveDate", selectedDate);

    // 2. ログイン画面（/login）へ遷移
    window.location.href = "/login";
  };

  // 現在表示している画像のindex
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // フェード用：true = 表示中 / false = フェードアウト中
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // 何秒ごとに画像を切り替えるか（ここでは8秒）
    const intervalMs = 8000;
    // フェードの長さ（CSSのtransitionと合わせる）ここでは1秒
    const fadeMs = 1000;
  
    const intervalId = setInterval(() => {
      // ① まずフェードアウト
      setIsVisible(false);
  
      // ② フェードアウト完了後に画像変更 → 再びフェードイン
      setTimeout(() => {
        setCurrentImageIndex((prev) => {
          // 別の画像にランダム変更（前と同じになりにくくする）
          let next = Math.floor(Math.random() * images.length);
          if (images.length > 1 && next === prev) {
            next = (next + 1) % images.length;
          }
          return next;
        });
        setIsVisible(true); // フェードイン
      }, fadeMs);
    }, intervalMs);
  
    // クリーンアップ
    return () => clearInterval(intervalId);
  }, [images.length]);

  // 右側パネルの中身（条件分岐部分）を先に組み立てる
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

  // ★ ここが UI 全体（背景 + 既存UI） ★
  return h(
    "div",
    { className: "app-root app" }, // ラッパー（必要ならCSSで調整）

    // 🔥 最背面の背景画像（position: fixed + z-index: -1 で後ろに）
    h("img", {
      src: images[currentImageIndex],
      className: "bg-slide-image",
      style: {
        opacity: isVisible ? 0.15 : 0,   // 表示中は0.15、フェードアウト中は0
      },
      alt: "background slide",
    }),

    // 既存のUI全体（appクラスでレイアウト）
    h(
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
          h("h2", { className: "detail-title" }, "選択した日の予約"),
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
    )
  );
}

export default App;