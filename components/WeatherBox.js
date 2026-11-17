import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function getWeatherIcon(precip, periodName) {
  if (precip > 0) return "🌧️";
  if (periodName === "Ніч") return "🌙";
  return "⛅";
}

function getCurrentPeriodLabel() {
  const h = new Date().getHours();
  if (h < 6) return "Ніч";
  if (h < 12) return "Ранок";
  if (h < 18) return "День";
  return "Вечір";
}

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  return parts.length === 3 ? `${parts[2]}.${parts[1]}` : dateStr;
}

export default function WeatherBox({ cityName, weather, loading }) {
  const [weatherTab, setWeatherTab] = useState("now");

  const days = weather?.days || [];
  const todayWeather = days[0];
  const tomorrowWeather = days[1];
  const threeDaysWeather = days.slice(0, 3);

  const currentLabel = getCurrentPeriodLabel();
  const currentSlot =
    todayWeather?.periods?.find((p) => p.period === currentLabel) ||
    todayWeather?.periods?.[0];

  return (
    <View style={styles.card}>
      <Text style={styles.header}>🌤️ Погода • {cityName}</Text>

      <View style={styles.tabsRow}>
        {[
          { key: "now", label: "Зараз" },
          { key: "tomorrow", label: "Завтра" },
          { key: "3days", label: "На 3 дні" },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, weatherTab === t.key && styles.tabBtnActive]}
            onPress={() => setWeatherTab(t.key)}
          >
            <Text
              style={[
                styles.tabText,
                weatherTab === t.key && styles.tabTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator
          size="small"
          color="#FFD700"
          style={{ marginVertical: 16 }}
        />
      ) : !weather || days.length === 0 ? (
        <Text style={styles.empty}>Дані про погоду тимчасово недоступні</Text>
      ) : weatherTab === "now" ? (
        <View>
          {currentSlot && (
            <View style={styles.nowBox}>
              <Text style={styles.nowTemp}>
                {getWeatherIcon(currentSlot.precipitation, currentSlot.period)}{" "}
                {currentSlot.temp > 0
                  ? `+${currentSlot.temp}`
                  : currentSlot.temp}
                °C
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.nowPeriod}>{currentSlot.period}</Text>
                <Text style={styles.nowMeta}>
                  💨 {currentSlot.wind} км/год • 💧 {currentSlot.humidity}% • ☔{" "}
                  {currentSlot.precipitation} мм
                </Text>
              </View>
            </View>
          )}
          <View style={styles.grid}>
            {todayWeather?.periods?.map((p, i) => (
              <View key={i} style={styles.cell}>
                <Text style={styles.pName}>{p.period}</Text>
                <Text style={styles.pIcon}>
                  {getWeatherIcon(p.precipitation, p.period)}
                </Text>
                <Text style={styles.pTemp}>
                  {p.temp > 0 ? `+${p.temp}` : p.temp}°
                </Text>
                <Text style={styles.pSub}>💨 {p.wind}</Text>
                <Text style={styles.pSub}>☔ {p.precipitation} мм</Text>
              </View>
            ))}
          </View>
        </View>
      ) : weatherTab === "tomorrow" ? (
        <View>
          <Text style={styles.dateSub}>
            Прогноз на {formatShortDate(tomorrowWeather?.date)}
          </Text>
          <View style={styles.grid}>
            {tomorrowWeather?.periods?.map((p, i) => (
              <View key={i} style={styles.cell}>
                <Text style={styles.pName}>{p.period}</Text>
                <Text style={styles.pIcon}>
                  {getWeatherIcon(p.precipitation, p.period)}
                </Text>
                <Text style={styles.pTemp}>
                  {p.temp > 0 ? `+${p.temp}` : p.temp}°
                </Text>
                <Text style={styles.pSub}>💨 {p.wind}</Text>
                <Text style={styles.pSub}>☔ {p.precipitation} мм</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View>
          {threeDaysWeather.map((d, idx) => (
            <View
              key={d.date || idx}
              style={[styles.dayRow, idx === 0 && { borderTopWidth: 0 }]}
            >
              <Text style={styles.dayDate}>
                {idx === 0
                  ? "Сьогодні"
                  : idx === 1
                    ? "Завтра"
                    : formatShortDate(d.date)}
              </Text>
              <View style={styles.miniRow}>
                {d.periods?.map((p, pIdx) => (
                  <View key={pIdx} style={styles.miniCell}>
                    <Text style={styles.miniLabel}>{p.period}</Text>
                    <Text style={styles.miniIcon}>
                      {getWeatherIcon(p.precipitation, p.period)}
                    </Text>
                    <Text style={styles.miniTemp}>
                      {p.temp > 0 ? `+${p.temp}` : p.temp}°
                    </Text>
                    {p.precipitation > 0 ? (
                      <Text style={styles.miniRain}>☔{p.precipitation}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  header: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  tabsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  tabBtnActive: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "#FFD700",
  },
  tabText: { color: "#94A3B8", fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: "#FFD700" },
  empty: {
    color: "#94A3B8",
    fontSize: 15,
    marginVertical: 16,
    textAlign: "center",
  },
  nowBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.75)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  nowTemp: { color: "#F8FAFC", fontSize: 32, fontWeight: "bold" },
  nowPeriod: { color: "#FFD700", fontSize: 17, fontWeight: "600" },
  nowMeta: { color: "#CBD5E1", fontSize: 13, marginTop: 3 },
  dateSub: { color: "#CBD5E1", fontSize: 14, marginBottom: 8 },
  grid: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  cell: {
    flex: 1,
    backgroundColor: "rgba(30, 41, 59, 0.65)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  pName: { color: "#CBD5E1", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  pIcon: { fontSize: 20, marginBottom: 3 },
  pTemp: { color: "#F8FAFC", fontSize: 19, fontWeight: "bold" },
  pSub: { color: "#94A3B8", fontSize: 12, marginTop: 3 },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  dayDate: { color: "#E2E8F0", fontSize: 15, fontWeight: "bold", width: "24%" },
  miniRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "74%",
  },
  miniCell: { alignItems: "center", flex: 1 },
  miniLabel: { color: "#94A3B8", fontSize: 12 },
  miniIcon: { fontSize: 15, marginTop: 2 },
  miniTemp: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 2,
  },
  miniRain: { color: "#38BDF8", fontSize: 11, marginTop: 1 },
});
