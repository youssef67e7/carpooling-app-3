import { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { View, FlatList, ActivityIndicator, Alert, Text, Pressable, LayoutAnimation, Platform, UIManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { fetchAdminUsers, updateAdminUserThunk, deleteAdminUserThunk } from "../store/slices/rideSlice";
import { useTheme } from "../context/ThemeProvider";
import DriverCard from "../components/DriverCard";
import EmptyState from "../components/EmptyState";
import AdminBottomSheet from "../components/admin/AdminBottomSheet";
import StaggerEntrance from "../components/ui/StaggerEntrance";
import CustomButton from "../components/CustomButton";
import { isFixedAdminEmail } from "../constants/fixedAdminEmails";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AdminUsersScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { adminUsers } = useSelector((s) => s.ride);
  const { user: me } = useSelector((s) => s.auth);
  const { colors, spacing, radius } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [initial, setInitial] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [sheetUser, setSheetUser] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("adminUsers") });
  }, [navigation, t]);

  const load = useCallback(async () => {
    await dispatch(fetchAdminUsers());
  }, [dispatch]);

  useEffect(() => {
    (async () => {
      await load();
      setInitial(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleExpand = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const openSheet = useCallback((item) => {
    setSheetUser(item);
  }, []);

  const buildSheetItems = useCallback(
    (item) => {
      const isSelf = String(item._id) === String(me?._id);
      const fixed = isFixedAdminEmail(item.email);
      const items = [
        {
          key: "verify",
          label: t("adminUserVerify"),
          approve: true,
          onPress: async () => {
            await dispatch(updateAdminUserThunk({ userId: item._id, is_verified: true }));
            await load();
          },
        },
      ];

      if (item.driver_application_status === "pending") {
        items.push(
          {
            key: "approveDriver",
            label: t("adminApproveDriver"),
            approve: true,
            onPress: async () => {
              await dispatch(
                updateAdminUserThunk({
                  userId: item._id,
                  driver_application_status: "approved",
                  driver_profile_status: "approved",
                  driver_review_note: "",
                })
              );
              await load();
            },
          },
          {
            key: "rejectDriver",
            label: t("adminRejectDriver"),
            destructive: true,
            onPress: async () => {
              await dispatch(
                updateAdminUserThunk({
                  userId: item._id,
                  driver_application_status: "rejected",
                  driver_profile_status: "rejected",
                  driver_review_note: t("adminDefaultRejectNote"),
                })
              );
              await load();
            },
          }
        );
      }
      if (!isSelf) {
        items.push(
          item.is_blocked
            ? {
                key: "unblock",
                label: t("adminUserUnblock"),
                onPress: async () => {
                  await dispatch(
                    updateAdminUserThunk({ userId: item._id, is_blocked: false, blocked_until: null, block_reason: "" })
                  );
                  await load();
                },
              }
            : {
                key: "block",
                label: t("adminUserBlock"),
                destructive: true,
                onPress: () => {
                  Alert.alert(t("adminConfirmBlockTitle"), item.email, [
                    { text: t("cancel"), style: "cancel" },
                    {
                      text: t("adminUserBlock"),
                      style: "destructive",
                      onPress: async () => {
                        await dispatch(
                          updateAdminUserThunk({
                            userId: item._id,
                            is_blocked: true,
                            blocked_until: null,
                            block_reason: t("adminUserBlockDefaultReason"),
                          })
                        );
                        await load();
                      },
                    },
                  ]);
                },
              }
        );
        if (!fixed) {
          items.push({
            key: "delete",
            label: t("adminUserDelete"),
            destructive: true,
            onPress: () => {
              Alert.alert(t("adminUserDeleteConfirmTitle"), item.email, [
                { text: t("cancel"), style: "cancel" },
                {
                  text: t("adminUserDelete"),
                  style: "destructive",
                  onPress: async () => {
                    await dispatch(deleteAdminUserThunk(item._id));
                    await load();
                  },
                },
              ]);
            },
          });
        }
      }
      return items;
    },
    [dispatch, load, me?._id, t]
  );

  if (initial) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={adminUsers}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={<EmptyState title={t("noUsers")} subtitle={t("pullToRefresh")} />}
        renderItem={({ item, index }) => {
          const open = expandedId === item._id;
          return (
            <StaggerEntrance index={index} style={{ marginBottom: spacing.sm }}>
              <Pressable onPress={() => toggleExpand(item._id)}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <DriverCard
                      driver={{ ...item, isOnline: !!item.isOnline }}
                      caption={`${t("role")}: ${item.role} · ${item.driver_application_status === "pending" ? t("adminBadgeDriverPending") : ""}${item.driver_application_status === "pending" ? " · " : ""}${item.is_blocked ? t("adminBadgeBlocked") : item.is_verified ? t("adminBadgeVerified") : t("adminBadgePending")}`}
                    />
                  </View>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={22}
                    color={colors.primary}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              </Pressable>
              {open ? (
                <View
                  style={{
                    marginTop: spacing.sm,
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceMuted,
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{item.email}</Text>
                  {item.block_reason ? (
                    <Text style={{ color: colors.danger, fontSize: 12, marginTop: 6 }}>{item.block_reason}</Text>
                  ) : null}
                  <CustomButton
                    title={t("adminSheetActions")}
                    onPress={() => openSheet(item)}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              ) : null}
            </StaggerEntrance>
          );
        }}
      />

      <AdminBottomSheet
        visible={!!sheetUser}
        onClose={() => setSheetUser(null)}
        title={sheetUser?.name}
        subtitle={sheetUser ? `${sheetUser.email}\n${t("role")}: ${sheetUser.role}` : ""}
        items={sheetUser ? buildSheetItems(sheetUser) : []}
        cancelLabel={t("cancel")}
      />
    </View>
  );
}
