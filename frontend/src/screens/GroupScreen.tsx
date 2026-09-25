// One group — prototype #s-group
//
//   ‹ Groups
//   Weekend Investors
//   (A)(M)(C)(H)(O)(L) 8 MEMBERS
//   OPEN PROPOSAL
//   ┌ (C) Chloe proposed               PRE-IPO ┐
//   │ Nova Rockets                              │
//   │ Buy together · $50 each · $400 order      │
//   │ ▓▓▓▓▓▓▓▓░░░  5 OF 8 IN        CLOSES 4PM  │   bar grows when you go in
//   │ [ I'm in for $50 ] → [ ✓ You're in ]      │
//   CHAT  (messages rise in)
//   [ Message Weekend Investors … ] [→]        ← rides above the keyboard

import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { interpolate, useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import type { GroupsStackParamList } from "../navigation/GroupsStack";
import { C, FONT, TYPE, em, h1Size } from "../theme";
import { Badge, Bar, Button, PressScale, Rise } from "../components/ui";
import { BackLink } from "../components/BackLink";
import { useSheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { Avatars } from "../components/groups/Avatars";
import { ProposeSheet } from "../components/groups/GroupSheets";
import { GROUPS_ARE_SAMPLE, goIn, joinGroup, leaveGroup, propose, sendMessage, useGroup } from "../data/groupsStore";
import { money } from "../lib/format";
import { hTap } from "../lib/haptics";

export function GroupScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const toast = useToast();
  const { params } = useRoute<RouteProp<GroupsStackParamList, "Group">>();
  const g = useGroup(params.id);

  const scrollRef = useRef<ScrollView>(null);
  const [text, setText] = useState("");
  const seeded = useRef(g?.chat.length ?? 0); // messages already there on open cascade in

  const kb = useAnimatedKeyboard();
  const composer = useAnimatedStyle(() => ({
    transform: [{ translateY: -kb.height.value }],
    paddingBottom: interpolate(kb.height.value, [0, 1], [insets.bottom + 12, 12], "clamp"),
  }));
  const spacer = useAnimatedStyle(() => ({ height: kb.height.value }));

  useEffect(() => {
    // new message → keep the latest in view
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [g?.chat.length]);

  if (!g) {
    return (
      <View style={[s.safe, { paddingTop: insets.top + 12, paddingHorizontal: 20, gap: 20 }]}>
        <BackLink label="Groups" onPress={() => nav.goBack()} />
        <Text style={TYPE.sub}>This group no longer exists.</Text>
      </View>
    );
  }

  const p = g.proposal;
  const send = () => {
    const t = text.trim();
    if (!t || !g.joined) return;
    hTap();
    sendMessage(g.id, t);
    setText("");
  };

  return (
    <View style={s.safe}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: 96 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <BackLink label="Groups" onPress={() => nav.goBack()} />

        <View style={{ gap: 12 }}>
          <Rise duration={460}>
            <Text style={[TYPE.h1, h1Size(29)]} accessibilityRole="header">
              {g.name}
            </Text>
          </Rise>
          <Rise duration={460} delay={55} style={s.memberRow}>
            <Avatars members={g.members} size={26} ring={C.ground} />
            <Text style={s.members}>
              {g.memberCount} {g.memberCount === 1 ? "MEMBER" : "MEMBERS"}
            </Text>
          </Rise>
        </View>

        {!g.joined ? (
          <Rise delay={110} duration={420}>
            <View style={[s.wash, { gap: 10 }]}>
              <Text style={TYPE.ttl}>You're not in this group</Text>
              <Text style={[TYPE.sub, { fontSize: 13, lineHeight: 20 }]}>
                {g.memberCount} members · ${g.min} minimum share. Join to see proposals and chat.
              </Text>
              <Button
                size="sm"
                title={`Join ${g.name}`}
                onPress={() => {
                  joinGroup(g.id);
                  toast(`Joined ${g.name}`, `${g.memberCount + 1} MEMBERS`);
                }}
              />
            </View>
          </Rise>
        ) : p ? (
          <Rise delay={110} duration={420} style={{ gap: 12 }}>
            <Text style={TYPE.lbl}>OPEN PROPOSAL</Text>
            <View style={s.card}>
              <View style={s.byRow}>
                <View style={[s.byAv, { backgroundColor: p.byColor }]}>
                  <Text style={s.byAvText}>{p.by[0]}</Text>
                </View>
                <Text style={[TYPE.sub, { flex: 1 }]}>{p.by} proposed</Text>
                <Badge label={p.kind} />
              </View>
              <View style={{ gap: 5 }}>
                <Text style={[TYPE.h2, { fontSize: 22 }]}>{p.asset}</Text>
                <Text style={[TYPE.sub, { fontSize: 13 }]}>
                  Buy together · {money(p.share)} each · {money(p.share * g.memberCount)} order
                </Text>
              </View>
              <View style={{ gap: 9 }}>
                <Bar value={p.inCount / Math.max(1, g.memberCount)} delay={200} />
                <View style={s.countRow}>
                  <Text style={s.count}>
                    {p.inCount} OF {g.memberCount} IN
                  </Text>
                  <Text style={s.closes}>CLOSES {p.closes}</Text>
                </View>
              </View>
              <Button
                size="sm"
                variant={p.youIn ? "ghost" : "primary"}
                title={p.youIn ? `✓ You're in for ${money(p.share)}` : `I'm in for ${money(p.share)}`}
                onPress={() => {
                  if (p.youIn) return;
                  goIn(g.id);
                  toast(`You are in for ${money(p.share)}`, `${p.asset.toUpperCase()} · ${p.inCount + 1} OF ${g.memberCount}`);
                }}
              />
              {GROUPS_ARE_SAMPLE ? <Text style={s.sample}>SAMPLE · NOTHING IS CHARGED</Text> : null}
            </View>
          </Rise>
        ) : (
          <Rise delay={110} duration={420}>
            <View style={[s.wash, { gap: 10 }]}>
              <Text style={TYPE.ttl}>No open proposal</Text>
              <Text style={[TYPE.sub, { fontSize: 13, lineHeight: 20 }]}>
                Anyone in the group can propose a buy. Everyone who is in pays their share, and each share settles to its
                own wallet.
              </Text>
              <Button
                size="sm"
                variant="ghost"
                title="Propose a buy"
                onPress={() =>
                  sheet.open(
                    <ProposeSheet
                      memberCount={g.memberCount}
                      onPropose={(a, share) => {
                        propose(g.id, a.stock.name, a.category === "pre-ipo" ? "PRE-IPO" : "STOCK", share);
                        sheet.close();
                        toast("Proposal is open", `${a.stock.symbol} · ${money(share)} EACH`);
                      }}
                    />,
                    { label: "Propose a buy" },
                  )
                }
              />
            </View>
          </Rise>
        )}

        <Rise delay={165} duration={420} style={{ gap: 12 }}>
          <Text style={TYPE.lbl}>CHAT</Text>
          {g.chat.length === 0 ? (
            <Text style={[TYPE.sub, { fontSize: 13.5 }]}>No messages yet. Say hello.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {g.chat.map((m, i) => (
                <Rise key={m.id} delay={i < seeded.current ? 220 + i * 70 : 0} duration={420}>
                  <Text style={s.msg}>
                    <Text style={s.from}>{m.from}</Text> {m.text}
                  </Text>
                </Rise>
              ))}
            </View>
          )}
        </Rise>

        {g.joined && g.memberCount > 1 ? (
          <Pressable
            onPress={() => {
              leaveGroup(g.id);
              toast(`Left ${g.name}`, "YOUR PAST BUYS STAY IN YOUR WALLET");
              nav.goBack();
            }}
            style={s.leave}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={s.leaveText}>Leave group</Text>
          </Pressable>
        ) : null}

        <Animated.View style={spacer} />
      </ScrollView>

      {g.joined ? (
        <Animated.View style={[s.composer, composer]}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            placeholder={`Message ${g.name}`}
            placeholderTextColor={C.ink4}
            selectionColor={C.mint}
            returnKeyType="send"
            style={s.field}
            accessibilityLabel="Message the group"
          />
          <PressScale
            scaleTo={0.92}
            onPress={send}
            disabled={!text.trim()}
            style={[s.send, !text.trim() && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            <Svg width={19} height={19} viewBox="0 0 20 20" fill="none" stroke={C.onMint} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3.5 10h13M11 4.5 16.5 10 11 15.5" />
            </Svg>
          </PressScale>
        </Animated.View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingHorizontal: 20, gap: 18 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  members: { fontFamily: FONT.mono400, fontSize: 10, letterSpacing: em(10, 0.16), color: C.ink3 },

  wash: { backgroundColor: C.sunk, borderRadius: 18, padding: 16 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 18, gap: 16 },
  byRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  byAv: { width: 26, height: 26, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  byAvText: { fontFamily: FONT.sans800, fontSize: 11, color: C.onMint },
  countRow: { flexDirection: "row", alignItems: "center" },
  count: { flex: 1, fontFamily: FONT.mono400, fontSize: 11, letterSpacing: em(11, 0.14), color: C.mint },
  closes: { fontFamily: FONT.mono400, fontSize: 10, letterSpacing: em(10, 0.14), color: C.ink4 },
  sample: { textAlign: "center", fontFamily: FONT.mono400, fontSize: 8.5, letterSpacing: em(8.5, 0.16), color: C.ink4, marginTop: -6 },

  msg: { fontFamily: FONT.sans400, fontSize: 13.5, lineHeight: 20, color: C.ink2 },
  from: { fontFamily: FONT.sans700, color: C.ink1 },

  leave: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center" },
  leaveText: { fontFamily: FONT.sans600, fontSize: 13.5, color: C.loss },

  composer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 10,
    backgroundColor: C.ground,
    borderTopWidth: 1,
    borderTopColor: C.hair,
  },
  field: { flex: 1, height: 48, borderRadius: 14, backgroundColor: C.surface, paddingHorizontal: 16, fontFamily: FONT.sans400, fontSize: 16, color: C.ink1 },
  send: { width: 48, height: 48, borderRadius: 999, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" },
});
