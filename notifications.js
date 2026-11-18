import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { fetchAppVersion, fetchSchedule, formatScheduleIntervals } from "./api";

const CURRENT_VERSION = "1.0.0";
const STORAGE_KEY = "@svet_odesa_settings_v1";
const LAST_HASH_KEY = "@svet_odesa_last_schedule";
const LAST_UPDATE_CHECK_KEY = "@svet_odesa_last_update_check";
const PENDING_UPDATE_KEY = "@svet_odesa_pending_update";
const LAST_NOTIFIED_VERSION_KEY = "@svet_odesa_notified_version";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const BG_TASK_NAME = "SVET_BACKGROUND_CHECK";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function isNightTime(date = new Date()) {
  const h = date.getHours();
  return h >= 23 || h < 7;
}

function getChannelId(settings) {
  if (settings.sound && settings.vibrate) return "svet_sound_vibro";
  if (settings.sound && !settings.vibrate) return "svet_sound_only";
  if (!settings.sound && settings.vibrate) return "svet_vibro_only";
  return "svet_silent";
}

function buildScheduleSignature(group, scheduleData) {
  return JSON.stringify({
    group,
    today: scheduleData?.today || scheduleData?.schedule?.today || [],
    tomorrow: scheduleData?.tomorrow || scheduleData?.schedule?.tomorrow || [],
  });
}

export async function setupNotificationChannels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("svet_sound_vibro", {
    name: "Світло (Звук + Вібро)",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    enableVibrate: true,
  });
  await Notifications.setNotificationChannelAsync("svet_sound_only", {
    name: "Світло (Тільки звук)",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    enableVibrate: false,
  });
  await Notifications.setNotificationChannelAsync("svet_vibro_only", {
    name: "Світло (Тільки вібро)",
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    enableVibrate: true,
  });
  await Notifications.setNotificationChannelAsync("svet_silent", {
    name: "Світло (Без звуку)",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
  });
}

export async function requestNotificationPermissions() {
  if (Platform.OS === "web") return false;
  await setupNotificationChannels();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Планируем напоминания за 15/30 минут до отключения и синхронизируем слепок графика
export async function scheduleOutageReminders(scheduleData, settings) {
  if (Platform.OS === "web" || !scheduleData) return;

  try {
    const sig = buildScheduleSignature(settings.group, scheduleData);
    await AsyncStorage.setItem(LAST_HASH_KEY, sig);
  } catch {}

  await Notifications.cancelAllScheduledNotificationsAsync();
  const minsBefore = Number(settings.notifyBeforeMinutes || 0);
  if (minsBefore <= 0) return;

  const channelId = getChannelId(settings);
  const now = new Date();

  const daysList = [
    {
      offset: 0,
      raw: scheduleData?.today || scheduleData?.schedule?.today || [],
    },
    {
      offset: 1,
      raw: scheduleData?.tomorrow || scheduleData?.schedule?.tomorrow || [],
    },
  ];

  for (const day of daysList) {
    const intervals = formatScheduleIntervals(day.raw);
    for (const row of intervals) {
      if (row.status !== "no") continue;

      const startStr = row.time.split("–")[0].trim();
      const [hh, mm] = startStr.split(":").map(Number);
      const outageTime = new Date(now);
      outageTime.setDate(now.getDate() + day.offset);
      outageTime.setHours(hh, mm, 0, 0);

      const triggerTime = new Date(
        outageTime.getTime() - minsBefore * 60 * 1000,
      );
      if (triggerTime <= now) continue;
      if (!settings.notifyNight && isNightTime(triggerTime)) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚡ Відключення через ${minsBefore} хв`,
          body: `Група ${settings.group}: світло вимкнуть о ${startStr}`,
          sound: settings.sound ? "default" : false,
        },
        trigger: { type: "date", date: triggerTime, channelId },
      });
    }
  }
}

// Фоновая задача проверки изменений графика и обновлений приложения
if (Platform.OS !== "web" && !TaskManager.isTaskDefined(BG_TASK_NAME)) {
  TaskManager.defineTask(BG_TASK_NAME, async () => {
    try {
      const rawSettings = await AsyncStorage.getItem(STORAGE_KEY);
      if (!rawSettings) return BackgroundFetch.BackgroundFetchResult.NoData;
      const settings = JSON.parse(rawSettings);

      if (!settings.bgUpdates) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      let hasNewData = false;

      // 1. Проверка графика отключений
      const freshData = await fetchSchedule(settings.group);
      const freshSignature = buildScheduleSignature(settings.group, freshData);
      const oldSignature = await AsyncStorage.getItem(LAST_HASH_KEY);

      await scheduleOutageReminders(freshData, settings);

      if (
        oldSignature &&
        oldSignature !== freshSignature &&
        settings.notifyScheduleChange
      ) {
        try {
          const parsedOld = JSON.parse(oldSignature);
          if (parsedOld.group === settings.group) {
            if (settings.notifyNight || !isNightTime(new Date())) {
              await setupNotificationChannels();
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "🔄 Графік відключень оновився!",
                  body: `Для групи ${settings.group} зʼявилися зміни. Заглянь у додаток.`,
                  sound: settings.sound ? "default" : false,
                },
                trigger: {
                  type: "timeInterval",
                  seconds: 1,
                  channelId: getChannelId(settings),
                },
              });
            }
            hasNewData = true;
          }
        } catch {}
      }

      // 2. Проверка новой версии приложения раз в сутки
      try {
        const lastCheckRaw = await AsyncStorage.getItem(LAST_UPDATE_CHECK_KEY);
        const lastCheck = lastCheckRaw ? Number(lastCheckRaw) : 0;
        const now = Date.now();

        if (now - lastCheck >= ONE_DAY_MS) {
          await AsyncStorage.setItem(LAST_UPDATE_CHECK_KEY, String(now));
          const versionData = await fetchAppVersion();

          if (versionData?.version && versionData.version !== CURRENT_VERSION) {
            await AsyncStorage.setItem(
              PENDING_UPDATE_KEY,
              JSON.stringify(versionData),
            );
            const lastNotified = await AsyncStorage.getItem(
              LAST_NOTIFIED_VERSION_KEY,
            );

            if (lastNotified !== versionData.version) {
              await AsyncStorage.setItem(
                LAST_NOTIFIED_VERSION_KEY,
                versionData.version,
              );
              if (settings.notifyNight || !isNightTime(new Date())) {
                await setupNotificationChannels();
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `⬆️ Доступне оновлення (v${versionData.version})`,
                    body: "Вийшла нова версія додатку. Відкрийте програму, щоб завантажити.",
                    sound: settings.sound ? "default" : false,
                  },
                  trigger: {
                    type: "timeInterval",
                    seconds: 1,
                    channelId: getChannelId(settings),
                  },
                });
              }
              hasNewData = true;
            }
          } else {
            await AsyncStorage.removeItem(PENDING_UPDATE_KEY);
          }
        }
      } catch {}

      return hasNewData
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function syncBackgroundTask(enabled) {
  if (Platform.OS === "web") return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BG_TASK_NAME);
    if (enabled && !isRegistered) {
      await BackgroundFetch.registerTaskAsync(BG_TASK_NAME, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    } else if (!enabled && isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BG_TASK_NAME);
    }
  } catch {}
}
