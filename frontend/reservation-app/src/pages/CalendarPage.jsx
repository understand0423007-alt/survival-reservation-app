import React from "react";

function ReservationList({ title, reservations }) {
  if (reservations.length === 0) return null;

  return (
    <div className="session-block">
      <h3 className="detail-session-title">{title}</h3>
      <ul className="reservation-list">
        {reservations.map((reservation) => (
          <li key={reservation.id} className="reservation-item">
            <div className="reservation-group">
              {reservation.peopleCount != null
                ? `${reservation.groupName}（${reservation.peopleCount}名）`
                : reservation.groupName}
            </div>
            <div className="reservation-time">{reservation.time}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailPanel({ selectedDate, reservations }) {
  if (!selectedDate) {
    return (
      <p className="detail-placeholder">
        カレンダーの日付をクリックすると、予約の詳細が表示されます。
      </p>
    );
  }

  if (reservations.length === 0) {
    return (
      <p className="detail-placeholder">{selectedDate} の予約はまだありません。</p>
    );
  }

  const amReservations = reservations.filter((item) => item.session === "午前の部");
  const pmReservations = reservations.filter((item) => item.session === "午後の部");
  const otherReservations = reservations.filter(
    (item) => !item.session || !["午前の部", "午後の部"].includes(item.session)
  );

  return (
    <div>
      <ReservationList title="午前の部（9:00〜11:00）" reservations={amReservations} />
      <ReservationList title="午後の部（13:00〜16:00）" reservations={pmReservations} />
      <ReservationList title="その他" reservations={otherReservations} />
    </div>
  );
}

export default function CalendarPage({
  monthLabel,
  calendarDays,
  selectedDate,
  selectedReservations,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onReserveClick,
  getReservationsForDate,
  formatDateKey,
  currentYear,
  currentMonth,
}) {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">SURE SHOT</h1>
        <p className="app-subtitle">サバゲーフィールドシュアショット</p>
      </header>

      <div className="calendar-container">
        <div className="calendar-panel">
          <div className="calendar-header">
            <button className="nav-button" onClick={onPrevMonth}>
              ←
            </button>
            <div className="month-label">{monthLabel}</div>
            <button className="nav-button" onClick={onNextMonth}>
              →
            </button>
          </div>

          <div className="weekday-row">
            {["日", "月", "火", "水", "木", "金", "土"].map((weekday) => (
              <div key={weekday} className="weekday-cell">
                {weekday}
              </div>
            ))}
          </div>

          <div className="days-grid">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="day-cell empty" />;
              }

              const dateKey = formatDateKey(currentYear, currentMonth, day);
              const reservations = getReservationsForDate(dateKey);
              const isSelected = selectedDate === dateKey;
              const totalPeople = reservations.reduce(
                (sum, reservation) =>
                  sum + (reservation.peopleCount != null ? reservation.peopleCount : 0),
                0
              );

              let className = "day-cell";
              if (isSelected) className += " selected";
              if (totalPeople > 0 && totalPeople <= 20) className += " capacity-low";
              else if (totalPeople > 20 && totalPeople < 40) className += " capacity-mid";
              else if (totalPeople >= 40) className += " capacity-full";

              return (
                <button
                  key={dateKey}
                  className={className}
                  onClick={() => onSelectDate(dateKey)}
                >
                  <div className="day-number">{day}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="detail-panel">
          <h2 className="detail-title">参加予定チーム</h2>
          <DetailPanel selectedDate={selectedDate} reservations={selectedReservations} />

          <div className="detail-footer">
            {selectedDate && selectedReservations.length > 0 ? (
              <div className="total-people">
                合計人数:{" "}
                {selectedReservations.reduce(
                  (sum, reservation) =>
                    sum + (reservation.peopleCount != null ? reservation.peopleCount : 0),
                  0
                )}
                名
              </div>
            ) : (
              <div className="total-people" />
            )}

            <button
              className="reserve-button"
              onClick={onReserveClick}
              disabled={!selectedDate}
            >
              予約する
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <div className="military-map-frame">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2619.469799298635!2d135.1648477!3d34.9650719!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60006e384e53c94b%3A0xb0ee221fd1b38517!2z44K144OQ44Ky44O844OV44Kj44O844Or44OJ44K344Ol44Ki44K344On44OD44OI!5e0!3m2!1sja!2sjp!4v1700000000000!5m2!1sja!2sjp"
            width="100%"
            height="300"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="サバゲーフィールドシュアショット"
          />
        </div>
      </div>
    </div>
  );
}

