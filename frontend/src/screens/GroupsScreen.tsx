// Groups tab — prototype #s-groups
//
//   GROUPS
//   Buy together                          [+ New]
//   A group pools one order. …
//   YOUR GROUPS
//   ┌ Weekend Investors        1 OPEN ┐   ← open proposal: mint ring
//   │ (A)(M)(C)… 8 MEMBERS  Nova Rockets · closes 4pm
//   ┌ Bhilwara Bulls             +18% ┐
//   OPEN TO JOIN
//   Pre-IPO Hunters  34 members · $50 minimum     [Join]

import { useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useNavigation, useScrollToTop } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";

import type { GroupsStackParamList } from "../navigation/GroupsStack";
import { useTabBarSpace } from "../navigation/TabBar";
import { C, EASE, FONT, TYPE, em } from "../theme";
import { Badge, PressScale, Rise } from "../components/ui";
import { useSplashDone } from "../components/SplashIntro";
import { useSheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { Avatars } from "../components/groups/Avatars";
import { NewGroupSheet } from "../components/groups/GroupSheets";
import {
  GROUPS_ARE_SAMPLE,
  createGroup,
  joinGroup,
  useGroups,
  type Group,
} from "../data/groupsStore";
import { hTap } from "../lib/haptics";

type Nav = NativeStackNavigationProp<GroupsStackParamList, "GroupsMain">;
const SLIDE = LinearTransition.duration(380).easing(EASE);

export function GroupsScreen() {
  const nav = useNavigation<Nav>();
  const bottom = useTabBarSpace();
  const splashDone = useSplashDone();
  const sheet = useSheet();
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const groups = useGroups();
  // groups with an open proposal first
  const mine = groups
    .filter((g) => g.joined)
    .sort((a, b) => Number(!!b.proposal) - Number(!!a.proposal));
  const open = groups.filter((g) => !g.joined && g.isPublic);

  const open_ = (g: Group) => nav.navigate("Group", { id: g.id });

  const newGroup = () =>
    sheet.open(
      <NewGroupSheet
        onCreate={(name, min, pub) => {
          const id = createGroup(name, min, pub);
          sheet.close();
          toast(`${name} is ready`, "INVITE PEOPLE YOU TRUST");
          setTimeout(() => nav.navigate("Group", { id }), 380);
        }}
      />,
      { label: "New group" },
    );

  const r = (i: number) => ({ when: splashDone, delay: i * 55, duration: 460 });

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.page, { paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headRow}>
          <View style={{ flex: 1, gap: 8 }}>
            <Rise {...r(0)}>
              <Text style={TYPE.lbl}>GROUPS</Text>
            </Rise>
            <Rise {...r(1)}>
              <Text style={TYPE.h1} accessibilityRole="header">
                Buy together
              </Text>
            </Rise>
          </View>
          <Rise {...r(1)}>
            <PressScale
              scaleTo={0.95}
              onPress={() => {
                hTap();
                newGroup();
              }}
              style={s.newBtn}
              accessibilityRole="button"
              accessibilityLabel="New group"
            >
              <Svg
                width={14}
                height={14}
                viewBox="0 0 20 20"
                fill="none"
                stroke={C.mint}
                strokeWidth={2.2}
                strokeLinecap="round"
              >
                <Path d="M10 4v12M4 10h12" />
              </Svg>
              <Text style={s.newText}>New</Text>
            </PressScale>
          </Rise>
        </View>
        <Rise {...r(2)}>
          <Text style={TYPE.body}>
            A group pools one order. Every share settles to its own wallet —
            nobody holds anybody else's asset.
          </Text>
        </Rise>

        <Rise {...r(3)} style={{ gap: 12 }}>
          <Text style={TYPE.lbl}>YOUR GROUPS</Text>
          {mine.length === 0 ? (
            <View style={s.wash}>
              <Text style={TYPE.sub}>
                You're not in a group yet. Join one below or start your own.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {mine.map((g, i) => (
                <Animated.View
                  key={g.id}
                  layout={SLIDE}
                  entering={FadeIn.duration(260)}
                >
                  <Rise when={splashDone} delay={220 + i * 55} duration={420}>
                    <GroupCard g={g} onPress={() => open_(g)} />
                  </Rise>
                </Animated.View>
              ))}
            </View>
          )}
        </Rise>

        <Rise {...r(4)} style={{ gap: 12 }}>
          <Text style={TYPE.lbl}>OPEN TO JOIN</Text>
          {open.length === 0 ? (
            <Text style={[TYPE.sub, { fontSize: 13.5 }]}>
              You have joined every open group.
            </Text>
          ) : (
            <View>
              {open.map((g, i) => (
                <Animated.View
                  key={g.id}
                  layout={SLIDE}
                  exiting={FadeOut.duration(200)}
                  style={[s.openRow, i < open.length - 1 && s.hair]}
                >
                  <PressScale
                    scaleTo={0.985}
                    onPress={() => open_(g)}
                    style={{ flex: 1, gap: 3 }}
                    accessibilityRole="button"
                  >
                    <Text style={TYPE.ttl}>{g.name}</Text>
                    <Text style={TYPE.sub}>
                      {g.memberCount} members · ${g.min} minimum
                    </Text>
                  </PressScale>
                  <PressScale
                    scaleTo={0.94}
                    onPress={() => {
                      hTap();
                      joinGroup(g.id);
                      toast(`Joined ${g.name}`, `${g.memberCount + 1} MEMBERS`);
                    }}
                    style={s.join}
                    accessibilityRole="button"
                    accessibilityLabel={`Join ${g.name}`}
                  >
                    <Text style={s.joinText}>Join</Text>
                  </PressScale>
                </Animated.View>
              ))}
            </View>
          )}
        </Rise>

        {GROUPS_ARE_SAMPLE ? (
          <Text style={s.foot}>SAMPLE GROUPS · NO MONEY MOVES YET</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function GroupCard({ g, onPress }: { g: Group; onPress: () => void }) {
  const p = g.proposal;
  return (
    <PressScale
      scaleTo={0.985}
      onPress={() => {
        hTap();
        onPress();
      }}
      style={[s.card, p && s.cardHot]}
      accessibilityRole="button"
      accessibilityLabel={`${g.name}, ${g.memberCount} members${p ? `, open proposal: ${p.asset}` : ""}`}
    >
      <View style={s.cardTop}>
        <Text style={s.cardName} numberOfLines={1}>
          {g.name}
        </Text>
        {p ? (
          <Badge
            label={p.youIn ? "YOU'RE IN" : "1 OPEN"}
            variant={p.youIn ? "mint" : "solid"}
          />
        ) : g.ret != null ? (
          <Text style={s.ret}>+{g.ret}%</Text>
        ) : (
          <Badge label="JOINED" variant="mint" />
        )}
      </View>
      <View style={s.cardBottom}>
        {p ? <Avatars members={g.members} /> : null}
        <Text style={s.members}>{g.memberCount} MEMBERS</Text>
        <Text style={[TYPE.sub, { flexShrink: 1 }]} numberOfLines={1}>
          {p
            ? `${p.asset} · closes ${p.closes.toLowerCase()}`
            : (g.last ?? "No buys yet")}
        </Text>
      </View>
    </PressScale>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingTop: 26, paddingHorizontal: 20, gap: 20 },
  headRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  newBtn: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: "#1D222B",
    borderWidth: 1,
    borderColor: "#313844",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  newText: { fontFamily: FONT.sans700, fontSize: 13.5, color: C.ink1 },

  wash: { backgroundColor: C.sunk, borderRadius: 18, padding: 16 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardHot: { borderColor: "rgba(55,224,153,0.38)" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardName: {
    flex: 1,
    fontFamily: FONT.sans800,
    fontSize: 17,
    letterSpacing: em(17, -0.04),
    color: C.ink1,
  },
  ret: { fontFamily: FONT.mono400, fontSize: 13, color: C.mint },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 10 },
  members: {
    flex: 1,
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: em(10, 0.14),
    color: C.ink3,
  },

  openRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },
  join: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.mint,
    justifyContent: "center",
  },
  joinText: { fontFamily: FONT.sans700, fontSize: 12.5, color: C.mint },

  foot: {
    textAlign: "center",
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: em(9.5, 0.16),
    color: C.ink4,
  },
});
