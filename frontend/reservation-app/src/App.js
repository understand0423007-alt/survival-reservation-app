import React, { useState, useMemo } from "react";
import "./App.css";

// 仮の予約データ（あとでAPIやFirebaseとつなぐときに差し替え）
const sampleReservations = {
  "2025-11-03": [
    { id: 1, groupName: "Red Dragons", time: "10:00" },
    { id: 2, groupName: "Blue Sharks", time: "11:00" },
    { id: 3, groupName: "Green Tigers", time: "13:00" },
  ],
  "2025-11-05": [{ id: 4, groupName: "Yellow Hawks", time: "09:00" }],
  "2025-11-10": [
    { id: 5, groupName: "Black Wolves", time: "14:00" },
    { id: 6, groupName: "White Rabbits", time: "15:00" },
  ],
};

function App() {
  // JSX のときと同じ state ロジック
  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(10); // 0=Jan, 10=Nov
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"

  // React.createElement を短く書くためのエイリアス
  const h = React.createElement;

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

  // ここが JSX でいう return ( <div>... ) に相当
  return h(
    "div",
    { className: "app" },
    // ヘッダー
    h(
      "header",
      { className: "app-header" },
      h("h1", { className: "app-title" }, "大会予約カレンダー"),
      h(
        "p",
        { className: "app-subtitle" },
        "参加グループの予約状況を一目でチェック！"
      )
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
        detailContent
      )
    )
  );
}

export default App;