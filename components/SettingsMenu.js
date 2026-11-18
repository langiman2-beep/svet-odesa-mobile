import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SettingsMenu({
  firstLaunchModal,
  onCloseFirstLaunch,
  menuOpen,
  onCloseMenu,
  cities,
  activeCity,
  settings,
  updateSettings,
  onCheckUpdate,
  appVersion,
}) {
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleToggleBgUpdates = (val) => {
    if (!val) {
      updateSettings({ bgUpdates: false, notifyScheduleChange: false });
    } else {
      updateSettings({ bgUpdates: true });
    }
  };

  const handleToggleScheduleNotify = (val) => {
    if (!val) {
      updateSettings({ notifyScheduleChange: false });
    } else {
      updateSettings({ notifyScheduleChange: true, bgUpdates: true });
    }
  };

  return (
    <>
      {/* Стартовый выбор города */}
      <Modal visible={firstLaunchModal} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.title}>📍 Оберіть ваш населений пункт</Text>
            <Text style={styles.sub}>
              Він збережеться автоматично. Змінити потім можна буде через меню
              ☰.
            </Text>
            <ScrollView style={styles.cityList}>
              {cities.map((c) => (
                <TouchableOpacity
                  key={c.key || c.name}
                  style={styles.cityItem}
                  onPress={() => {
                    updateSettings({ city: c });
                    onCloseFirstLaunch();
                  }}
                >
                  <Text style={styles.cityText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Бургер-меню настроек */}
      <Modal visible={menuOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.menuBox}>
            <View style={styles.menuHeader}>
              <Text style={styles.title}>⚙️ Налаштування</Text>
              <TouchableOpacity
                style={styles.closeWrap}
                onPress={() => {
                  setCityPickerOpen(false);
                  onCloseMenu();
                }}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>Населений пункт</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setCityPickerOpen(!cityPickerOpen)}
              >
                <Text style={styles.dropdownText}>📍 {activeCity.name}</Text>
                <Text style={styles.arrow}>{cityPickerOpen ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {cityPickerOpen && (
                <ScrollView style={styles.menuCityList} nestedScrollEnabled>
                  {cities.map((c) => (
                    <TouchableOpacity
                      key={c.key || c.name}
                      style={styles.dropdownItem}
                      onPress={() => {
                        updateSettings({ city: c });
                        setCityPickerOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          c.key === activeCity.key && {
                            color: "#FFD700",
                            fontWeight: "bold",
                          },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={[styles.sectionLabel, { marginTop: 18 }]}>
                Сповіщати про відключення світла за
              </Text>
              <View style={styles.segmentRow}>
                {[
                  { val: 15, label: "15 хв" },
                  { val: 30, label: "30 хв" },
                  { val: 0, label: "Вимк" },
                ].map((opt) => {
                  const active = settings.notifyBeforeMinutes === opt.val;
                  return (
                    <TouchableOpacity
                      key={opt.val}
                      style={[
                        styles.segmentBtn,
                        active && styles.segmentBtnActive,
                      ]}
                      onPress={() =>
                        updateSettings({ notifyBeforeMinutes: opt.val })
                      }
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          active && styles.segmentTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Фонові оновлення</Text>
                  <Text style={styles.switchHint}>
                    Оновлює розклад та нагадування у фоні
                  </Text>
                </View>
                <Switch
                  value={settings.bgUpdates}
                  onValueChange={handleToggleBgUpdates}
                  trackColor={{ false: "#334155", true: "#CA8A04" }}
                  thumbColor={settings.bgUpdates ? "#FFD700" : "#94A3B8"}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>
                    Сповіщати про зміну графіків
                  </Text>
                  <Text style={styles.switchHint}>
                    Пуш-повідомлення, коли оновлюється розклад групи
                  </Text>
                </View>
                <Switch
                  value={settings.notifyScheduleChange}
                  onValueChange={handleToggleScheduleNotify}
                  trackColor={{ false: "#334155", true: "#CA8A04" }}
                  thumbColor={
                    settings.notifyScheduleChange ? "#FFD700" : "#94A3B8"
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchTitle}>Сповіщення вночі</Text>
                <Switch
                  value={settings.notifyNight}
                  onValueChange={(val) => updateSettings({ notifyNight: val })}
                  trackColor={{ false: "#334155", true: "#CA8A04" }}
                  thumbColor={settings.notifyNight ? "#FFD700" : "#94A3B8"}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchTitle}>Звук сповіщень</Text>
                <Switch
                  value={settings.sound}
                  onValueChange={(val) => updateSettings({ sound: val })}
                  trackColor={{ false: "#334155", true: "#CA8A04" }}
                  thumbColor={settings.sound ? "#FFD700" : "#94A3B8"}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchTitle}>Вібрація</Text>
                <Switch
                  value={settings.vibrate}
                  onValueChange={(val) => updateSettings({ vibrate: val })}
                  trackColor={{ false: "#334155", true: "#CA8A04" }}
                  thumbColor={settings.vibrate ? "#FFD700" : "#94A3B8"}
                />
              </View>

              <TouchableOpacity
                style={styles.updateBtn}
                onPress={onCheckUpdate}
              >
                <Text style={styles.updateText}>🔄 Перевірити оновлення</Text>
                {appVersion ? (
                  <Text style={styles.versionSubText}>
                    Поточна версія: v{appVersion}
                  </Text>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aboutBtn}
                onPress={() => setAboutOpen(true)}
              >
                <Text style={styles.aboutBtnText}>ℹ️ Про програму</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Модальное окно "Про програму" (юридическая информация) */}
      <Modal visible={aboutOpen} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.aboutBox}>
            <View style={styles.menuHeader}>
              <Text style={styles.title}>ℹ️ Про програму</Text>
              <TouchableOpacity
                style={styles.closeWrap}
                onPress={() => setAboutOpen(false)}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {appVersion ? (
                <Text style={styles.aboutVersionBadge}>
                  Версія додатку: v{appVersion}
                </Text>
              ) : null}

              <Text style={styles.legalHeading}>
                1. Законність та незалежний статус
              </Text>
              <Text style={styles.legalText}>
                Додаток «Світло Одеса» є незалежним інформаційно-довідковим
                сервісом, створеним відповідно до ст. 34 Конституції України та
                Закону України «Про інформацію». Додаток не є офіційним
                продуктом АТ «ДТЕК Одеські електромережі» чи групи компаній ДТЕК
                і не повʼязаний із ними. Програма лише у зручному вигляді
                відображає відкриті загальнодоступні дані про графіки
                електропостачання та прогноз погоди (за даними відкритого
                метеосервісу Open-Meteo).
              </Text>

              <Text style={styles.legalHeading}>
                2. Безпека пристрою та захист даних
              </Text>
              <Text style={styles.legalText}>
                Відповідно до Закону України «Про захист персональних даних»,
                додаток не збирає, не зберігає та не передає третім особам
                персональні дані користувачів. Програма не має технічного
                доступу до контактів, фотографій, файлів, камери, мікрофона,
                геолокації чи облікових записів. Усі налаштування (обране місто
                та група) зберігаються виключно локально у памʼяті вашого
                телефону. Для захисту сервера від автоматизованих мережевих атак
                (DDoS) сервер тимчасово обробляє в оперативній памʼяті технічну
                мережеву інформацію (IP-адресу запиту) без ідентифікації особи
                та без запису на постійні носії.
              </Text>

              <Text style={styles.legalHeading}>
                3. Відмова від відповідальності
              </Text>
              <Text style={styles.legalText}>
                Інформація у додатку надається «як є» (as is) виключно з
                ознайомчою метою. Автор програми не є оператором системи
                розподілу електроенергії, не формує графіки відключень і не несе
                юридичної чи матеріальної відповідальності за можливі
                розбіжності фактичних відключень із графіками, затримки
                оновлення даних або будь-які наслідки, повʼязані з використанням
                цієї інформації.
              </Text>

              <TouchableOpacity
                style={styles.aboutCloseMainBtn}
                onPress={() => setAboutOpen(false)}
              >
                <Text style={styles.aboutCloseMainText}>Зрозуміло</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  modalBox: {
    width: "96%",
    maxWidth: 460,
    maxHeight: "88%",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#FFD700",
  },
  title: { color: "#FFD700", fontSize: 22, fontWeight: "bold" },
  sub: {
    color: "#CBD5E1",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 14,
    lineHeight: 20,
  },
  cityList: { maxHeight: 420 },
  cityItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.2)",
  },
  cityText: { color: "#F8FAFC", fontSize: 18, fontWeight: "500" },
  menuBox: {
    width: "96%",
    maxWidth: 460,
    height: "92%",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 215, 0, 0.5)",
  },
  aboutBox: {
    width: "96%",
    maxWidth: 460,
    maxHeight: "88%",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#FFD700",
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.2)",
  },
  closeWrap: {
    padding: 6,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 10,
  },
  closeBtn: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "bold",
    paddingHorizontal: 6,
  },
  sectionLabel: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.35)",
  },
  dropdownText: { color: "#F8FAFC", fontSize: 18, fontWeight: "600" },
  arrow: { color: "#FFD700", fontSize: 15 },
  menuCityList: {
    maxHeight: 220,
    marginTop: 8,
    backgroundColor: "#1E293B",
    borderRadius: 12,
  },
  dropdownItem: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.18)",
  },
  dropdownItemText: { color: "#F8FAFC", fontSize: 17 },
  segmentRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1E293B",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
  segmentBtnActive: {
    backgroundColor: "rgba(255, 215, 0, 0.24)",
    borderColor: "#FFD700",
  },
  segmentText: { color: "#CBD5E1", fontSize: 16, fontWeight: "600" },
  segmentTextActive: { color: "#FFD700", fontWeight: "bold" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.18)",
  },
  switchTitle: { color: "#F8FAFC", fontSize: 17, fontWeight: "600" },
  switchHint: { color: "#94A3B8", fontSize: 13, marginTop: 3, lineHeight: 17 },
  updateBtn: {
    marginTop: 20,
    backgroundColor: "rgba(255, 215, 0, 0.18)",
    borderWidth: 1.5,
    borderColor: "#FFD700",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  updateText: { color: "#FFD700", fontSize: 17, fontWeight: "bold" },
  versionSubText: {
    color: "#CBD5E1",
    fontSize: 13,
    marginTop: 4,
  },
  aboutBtn: {
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  aboutBtnText: { color: "#E2E8F0", fontSize: 16, fontWeight: "600" },
  aboutVersionBadge: {
    color: "#FFD700",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  legalHeading: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6,
  },
  legalText: {
    color: "#E2E8F0",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  aboutCloseMainBtn: {
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: "#FFD700",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  aboutCloseMainText: {
    color: "#0A0F1C",
    fontSize: 17,
    fontWeight: "bold",
  },
});
