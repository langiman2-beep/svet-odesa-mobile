import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchAppVersion,
  fetchCities,
  fetchSchedule,
  fetchWeather,
  formatScheduleIntervals,
} from "./api";
import DisclaimerBox from "./components/DisclaimerBox";
import SettingsMenu from "./components/SettingsMenu";
import WeatherBox from "./components/WeatherBox";
import {
  requestNotificationPermissions,
  scheduleOutageReminders,
  syncBackgroundTask,
} from "./notifications";

const CURRENT_VERSION = "1.0.0";
const STORAGE_KEY = "@svet_odesa_settings_v1";
const LAST_UPDATE_CHECK_KEY = "@svet_odesa_last_update_check";
const PENDING_UPDATE_KEY = "@svet_odesa_pending_update";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const GROUPS = [
  "1.1",
  "1.2",
  "2.1",
  "2.2",
  "3.1",
  "3.2",
  "4.1",
  "4.2",
  "5.1",
  "5.2",
  "6.1",
  "6.2",
];

const DEFAULT_CITIES = [
  { key: "odesa", name: "Одеса" },
  { key: "chornomorsk", name: "Чорноморськ" },
  { key: "izmail", name: "Ізмаїл" },
  { key: "bilhorod", name: "Білгород-Дністровський" },
];

const DEFAULT_SETTINGS = {
  city: null,
  group: "1.1",
  bgUpdates: true,
  notifyScheduleChange: true,
  notifyBeforeMinutes: 30,
  notifyNight: false,
  sound: true,
  vibrate: true,
};

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [cities, setCities] = useState(DEFAULT_CITIES);
  const [firstLaunchModal, setFirstLaunchModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const [tab, setTab] = useState("today");
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [justUpdated, setJustUpdated] = useState(false);

  const [pendingUpdate, setPendingUpdate] = useState(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(PENDING_UPDATE_KEY),
    ])
      .then(([rawSettings, rawPending]) => {
        if (rawSettings) {
          const merged = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) };
          setSettings(merged);
          if (!merged.city) setFirstLaunchModal(true);
        } else {
          setFirstLaunchModal(true);
        }

        if (rawPending) {
          const parsedUpdate = JSON.parse(rawPending);
          if (
            parsedUpdate?.version &&
            parsedUpdate.version !== CURRENT_VERSION
          ) {
            setPendingUpdate(parsedUpdate);
          } else {
            AsyncStorage.removeItem(PENDING_UPDATE_KEY).catch(() => {});
          }
        }
      })
      .catch(() => setFirstLaunchModal(true))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    requestNotificationPermissions();
    syncBackgroundTask(settings.bgUpdates);
  }, [hydrated, settings.bgUpdates]);

  const startDownloadUpdate = (downloadUrl) => {
    if (!downloadUrl) return;
    if (Platform.OS === "web") {
      window.open(downloadUrl, "_blank");
    } else {
      Linking.openURL(downloadUrl).catch(() => {
        Alert.alert(
          "Помилка",
          "Не вдалося відкрити посилання для завантаження.",
        );
      });
    }
  };

  const showUpdatePrompt = (data) => {
    const title = `Доступне оновлення (v${data.version})`;
    const body = `${
      data.notes || "Вийшла нова версія додатку."
    }\n\nВи можете завантажити оновлення зараз або оновити програму пізніше через меню чи кнопкою «Оновити» на головному екрані.`;

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${body}`)) {
        startDownloadUpdate(data.downloadUrl);
      }
    } else {
      Alert.alert(title, body, [
        { text: "Пізніше", style: "cancel" },
        {
          text: "Завантажити",
          onPress: () => startDownloadUpdate(data.downloadUrl),
        },
      ]);
    }
  };

  useEffect(() => {
    if (!hydrated || firstLaunchModal) return;

    const checkDailyUpdate = async () => {
      try {
        const lastCheckRaw = await AsyncStorage.getItem(LAST_UPDATE_CHECK_KEY);
        const lastCheck = lastCheckRaw ? Number(lastCheckRaw) : 0;
        const now = Date.now();

        if (now - lastCheck < ONE_DAY_MS) {
          return;
        }

        await AsyncStorage.setItem(LAST_UPDATE_CHECK_KEY, String(now));
        const data = await fetchAppVersion();

        if (data?.version && data.version !== CURRENT_VERSION) {
          setPendingUpdate(data);
          await AsyncStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify(data));
          showUpdatePrompt(data);
        } else {
          setPendingUpdate(null);
          await AsyncStorage.removeItem(PENDING_UPDATE_KEY);
        }
      } catch (e) {}
    };

    checkDailyUpdate();
  }, [hydrated, firstLaunchModal]);

  const updateSettings = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    fetchCities()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setCities(res);
        } else if (res && typeof res === "object") {
          const rawObj = res.cities || res;
          const mapped = Object.entries(rawObj).map(([key, val]) => ({
            key,
            name: typeof val === "string" ? val : val.name,
          }));
          if (mapped.length > 0) setCities(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const activeCity = settings.city || DEFAULT_CITIES[0];

  useEffect(() => {
    if (!hydrated) return;
    setWeatherLoading(true);
    fetchWeather(activeCity.key)
      .then((res) => setWeather(res))
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  }, [activeCity.key, hydrated]);

  const loadSchedule = async (
    targetGroup = settings.group,
    isManual = false,
  ) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSchedule(targetGroup);
      setScheduleData(data);
      if (isManual) {
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 2000);
      }
    } catch (e) {
      setError("Немає інтернету");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    loadSchedule(settings.group, false);
  }, [settings.group, hydrated]);

  useEffect(() => {
    if (!hydrated || !scheduleData) return;
    scheduleOutageReminders(scheduleData, settings);
  }, [scheduleData, settings, hydrated]);

  const handleCheckUpdate = async () => {
    try {
      await AsyncStorage.setItem(LAST_UPDATE_CHECK_KEY, String(Date.now()));
      const data = await fetchAppVersion();
      if (data?.version && data.version !== CURRENT_VERSION) {
        setPendingUpdate(data);
        await AsyncStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify(data));
        showUpdatePrompt(data);
      } else {
        setPendingUpdate(null);
        await AsyncStorage.removeItem(PENDING_UPDATE_KEY);
        const msg = `У вас встановлена актуальна версія додатку (v${CURRENT_VERSION}).`;
        if (Platform.OS === "web") {
          window.alert(msg);
        } else {
          Alert.alert("Оновлення", msg);
        }
      }
    } catch (e) {
      const errMsg = "Немає інтернету";
      if (Platform.OS === "web") {
        window.alert(errMsg);
      } else {
        Alert.alert("Помилка", errMsg);
      }
    }
  };

  const rawDay =
    tab === "today"
      ? scheduleData?.today || scheduleData?.schedule?.today || []
      : scheduleData?.tomorrow || scheduleData?.schedule?.tomorrow || [];

  const intervals = formatScheduleIntervals(rawDay);
  const updatedText =
    scheduleData?.dtekUpdatedAt ||
    scheduleData?.updatedAt ||
    scheduleData?.lastUpdate ||
    "";
  const warningMessage = scheduleData?.warningMessage || null;
  const tgNotice = scheduleData?.tgNotice || null;

  if (!hydrated) {
    return (
      <View style={[styles.bg, styles.centerLoader]}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("./assets/bg.webp")}
      style={styles.bg}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.container}>
            {/* Шапка */}
            <View style={styles.headerCard}>
              <View style={styles.headerTopRow}>
                <TouchableOpacity
                  style={styles.burgerBtn}
                  onPress={() => setMenuOpen(true)}
                >
                  <Text style={styles.burgerIcon}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.title}>⚡ Світло Одеса</Text>
                <View style={{ width: 40 }} />
              </View>

              {pendingUpdate && (
                <TouchableOpacity
                  style={styles.updateBannerBtn}
                  onPress={() => showUpdatePrompt(pendingUpdate)}
                >
                  <Text style={styles.updateBannerText}>
                    ⬆️ Оновити (v{pendingUpdate.version})
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.author}>by Langust</Text>
            </View>

            {/* Выбор группы */}
            <View style={styles.controlsCard}>
              <View style={styles.groupHeaderLine}>
                <Text style={styles.label}>Група відключень</Text>
                <Text style={styles.cityBadge}>📍 {activeCity.name}</Text>
              </View>

              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setGroupOpen(!groupOpen)}
              >
                <Text style={styles.dropdownText}>
                  🔌 Група {settings.group}
                </Text>
                <Text style={styles.arrow}>{groupOpen ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {groupOpen && (
                <View style={styles.groupGrid}>
                  {GROUPS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.groupChip,
                        g === settings.group && styles.groupChipActive,
                      ]}
                      onPress={() => {
                        updateSettings({ group: g });
                        setGroupOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.groupChipText,
                          g === settings.group && styles.groupChipTextActive,
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Вкладки Сьогодні / Завтра */}
            <View style={styles.tabsRow}>
              {["today", "tomorrow"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                  onPress={() => setTab(t)}
                >
                  <Text
                    style={[styles.tabText, tab === t && styles.tabTextActive]}
                  >
                    {t === "today" ? "Сьогодні" : "Завтра"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Таблица графика */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableTitle}>
                  Графік • Група {settings.group}
                </Text>
                <TouchableOpacity
                  onPress={() => loadSchedule(settings.group, true)}
                >
                  <Text
                    style={[
                      styles.refreshBtn,
                      justUpdated && { color: "#22C55E" },
                    ]}
                  >
                    {justUpdated ? "✅ Оновлено" : "🔄 Оновити"}
                  </Text>
                </TouchableOpacity>
              </View>

              {updatedText ? (
                <Text style={styles.updatedText}>
                  Дані станом на: {updatedText}
                </Text>
              ) : null}

              {warningMessage ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>⚠️ {warningMessage}</Text>
                </View>
              ) : null}

              {tgNotice ? (
                <View style={styles.tgNoticeBox}>
                  <Text style={styles.tgNoticeTitle}>
                    📢 Повідомлення з резервного джерела:
                  </Text>
                  <Text style={styles.tgNoticeText}>{tgNotice}</Text>
                </View>
              ) : null}

              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="#FFD700"
                  style={{ marginVertical: 24 }}
                />
              ) : error ? (
                <Text style={styles.errorText}>⚠️ {error}</Text>
              ) : intervals.length === 0 ? (
                <Text style={styles.emptyText}>
                  На обраний день даних поки немає або відключень не
                  заплановано.
                </Text>
              ) : (
                intervals.map((row, idx) => (
                  <View key={idx} style={styles.row}>
                    <Text style={styles.rowTime}>{row.time}</Text>
                    <View style={styles.rowStatusBox}>
                      <Text style={[styles.rowStatus, { color: row.color }]}>
                        {row.icon} {row.label}
                      </Text>
                      <Text style={styles.rowReason}>{row.reason}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Интерактивная юридическая приписка */}
            <DisclaimerBox />

            {/* Кубик погоды */}
            <WeatherBox
              cityName={activeCity.name}
              weather={weather}
              loading={weatherLoading}
            />
          </View>
        </ScrollView>

        {/* Кубик меню и первого выбора города */}
        <SettingsMenu
          firstLaunchModal={firstLaunchModal}
          onCloseFirstLaunch={() => setFirstLaunchModal(false)}
          menuOpen={menuOpen}
          onCloseMenu={() => setMenuOpen(false)}
          cities={cities}
          activeCity={activeCity}
          settings={settings}
          updateSettings={updateSettings}
          onCheckUpdate={handleCheckUpdate}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  centerLoader: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0F1C",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 15, 28, 0.52)",
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 8 : 0,
  },
  scroll: { flexGrow: 1, alignItems: "center", padding: 14, paddingBottom: 32 },
  container: { width: "100%", maxWidth: 430 },
  headerCard: {
    backgroundColor: "rgba(15, 23, 42, 0.84)",
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.35)",
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  burgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  burgerIcon: { color: "#FFD700", fontSize: 22, fontWeight: "bold" },
  title: {
    color: "#FFD700",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
  },
  updateBannerBtn: {
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: "#FFD700",
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  updateBannerText: {
    color: "#0A0F1C",
    fontSize: 15,
    fontWeight: "bold",
  },
  author: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 4,
  },
  controlsCard: {
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    marginBottom: 12,
  },
  groupHeaderLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: { color: "#CBD5E1", fontSize: 14 },
  cityBadge: { color: "#FFD700", fontSize: 14, fontWeight: "600" },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.25)",
  },
  dropdownText: { color: "#F8FAFC", fontSize: 18, fontWeight: "600" },
  arrow: { color: "#FFD700", fontSize: 14 },
  groupGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  groupChip: {
    width: "22.5%",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  groupChipActive: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "#FFD700",
  },
  groupChipText: { color: "#E2E8F0", fontSize: 17, fontWeight: "600" },
  groupChipTextActive: { color: "#FFD700" },
  tabsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  tabBtnActive: {
    backgroundColor: "rgba(255, 215, 0, 0.22)",
    borderColor: "#FFD700",
  },
  tabText: { color: "#94A3B8", fontSize: 17, fontWeight: "600" },
  tabTextActive: { color: "#FFD700", fontWeight: "bold" },
  tableCard: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tableTitle: { color: "#F8FAFC", fontSize: 19, fontWeight: "bold" },
  refreshBtn: { color: "#FFD700", fontSize: 15, fontWeight: "600" },
  updatedText: { color: "#94A3B8", fontSize: 13, marginBottom: 10 },
  warningBox: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    borderColor: "#EAB308",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  warningText: { color: "#FDE047", fontSize: 14, fontWeight: "600" },
  tgNoticeBox: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "#38BDF8",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  tgNoticeTitle: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  tgNoticeText: { color: "#E2E8F0", fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  rowTime: { color: "#F8FAFC", fontSize: 21, fontWeight: "bold", width: "44%" },
  rowStatusBox: { width: "54%", alignItems: "flex-end" },
  rowStatus: { fontSize: 17, fontWeight: "bold" },
  rowReason: { color: "#CBD5E1", fontSize: 13, marginTop: 3 },
  errorText: {
    color: "#F87171",
    fontSize: 15,
    marginVertical: 12,
    textAlign: "center",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 15,
    marginVertical: 16,
    textAlign: "center",
  },
});
