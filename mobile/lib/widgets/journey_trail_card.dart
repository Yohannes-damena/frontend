import 'package:flutter/material.dart';

import '../l10n/app_strings.dart';
import '../models/museum_room_summary.dart';
import '../models/room.dart';
import '../screens/stitch_export/stitch_theme.dart';

/// Growing, session-scoped trail of rooms the visitor has actually opened.
///
/// Visited rooms are supplied dynamically; an outlined final node represents
/// [hasNextRoom], while a completed state closes the trail otherwise.
class JourneyTrailCard extends StatelessWidget {
  const JourneyTrailCard({
    super.key,
    required this.visitedRooms,
    required this.currentRoomId,
    required this.hasNextRoom,
    this.fullRoomList,
    this.onContinue,
  });

  final List<Room> visitedRooms;
  final String currentRoomId;
  final bool hasNextRoom;
  final List<MuseumRoomSummary>? fullRoomList;
  final VoidCallback? onContinue;

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);
    final List<Room> ordered = List<Room>.of(visitedRooms)
      ..sort((Room a, Room b) {
        final int byOrder = a.storyOrder.compareTo(b.storyOrder);
        return byOrder != 0 ? byOrder : a.id.compareTo(b.id);
      });
    final List<MuseumRoomSummary>? fullRooms = fullRoomList;
    final Set<String> visitedIds =
        visitedRooms.map((Room room) => room.id).toSet();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: StitchTheme.panel,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: StitchTheme.muted.withValues(alpha: 0.22),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            s.journeyTrail,
            style: StitchTheme.overline(
              size: 11,
              color: StitchTheme.muted,
            ),
          ),
          const SizedBox(height: 16),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child:
                fullRooms != null && fullRooms.isNotEmpty
                    ? _FullTrail(
                      rooms: fullRooms,
                      visitedIds: visitedIds,
                      currentRoomId: currentRoomId,
                      isComplete: !hasNextRoom,
                      completeLabel: s.tourComplete,
                    )
                    : _GrowingTrail(
                      rooms: ordered,
                      currentRoomId: currentRoomId,
                      hasNextRoom: hasNextRoom,
                      nextLabel: s.next,
                      completeLabel: s.tourComplete,
                      onContinue: onContinue,
                    ),
          ),
        ],
      ),
    );
  }
}

class _FullTrail extends StatelessWidget {
  const _FullTrail({
    required this.rooms,
    required this.visitedIds,
    required this.currentRoomId,
    required this.isComplete,
    required this.completeLabel,
  });

  final List<MuseumRoomSummary> rooms;
  final Set<String> visitedIds;
  final String currentRoomId;
  final bool isComplete;
  final String completeLabel;

  @override
  Widget build(BuildContext context) {
    final List<MuseumRoomSummary> ordered = List<MuseumRoomSummary>.of(rooms)
      ..sort(
        (MuseumRoomSummary a, MuseumRoomSummary b) =>
            a.storyOrder.compareTo(b.storyOrder),
      );

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        for (int index = 0; index < ordered.length; index++) ...<Widget>[
          _FullTrailNode(
            room: ordered[index],
            state:
                ordered[index].id == currentRoomId
                    ? _RoomTrailState.current
                    : visitedIds.contains(ordered[index].id)
                    ? _RoomTrailState.visited
                    : _RoomTrailState.upcoming,
          ),
          if (index < ordered.length - 1)
            _Connector(
              highlighted: visitedIds.contains(ordered[index].id),
            ),
        ],
        if (isComplete) ...<Widget>[
          const _Connector(highlighted: true),
          _CompleteNode(label: completeLabel),
        ],
      ],
    );
  }
}

class _GrowingTrail extends StatelessWidget {
  const _GrowingTrail({
    required this.rooms,
    required this.currentRoomId,
    required this.hasNextRoom,
    required this.nextLabel,
    required this.completeLabel,
    this.onContinue,
  });

  final List<Room> rooms;
  final String currentRoomId;
  final bool hasNextRoom;
  final String nextLabel;
  final String completeLabel;
  final VoidCallback? onContinue;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        for (int index = 0; index < rooms.length; index++) ...<Widget>[
          _VisitedNode(
            room: rooms[index],
            isCurrent: rooms[index].id == currentRoomId,
          ),
          _Connector(
            highlighted: index < rooms.length - 1 || !hasNextRoom,
          ),
        ],
        if (hasNextRoom)
          _UpcomingNode(label: nextLabel, onTap: onContinue)
        else
          _CompleteNode(label: completeLabel),
      ],
    );
  }
}

enum _RoomTrailState { visited, current, upcoming }

class _FullTrailNode extends StatelessWidget {
  const _FullTrailNode({required this.room, required this.state});

  final MuseumRoomSummary room;
  final _RoomTrailState state;

  @override
  Widget build(BuildContext context) {
    final bool isCurrent = state == _RoomTrailState.current;
    final bool isUpcoming = state == _RoomTrailState.upcoming;

    return Tooltip(
      message: room.title,
      child: SizedBox(
        width: 54,
        child: Column(
          children: <Widget>[
            SizedBox(
              width: 24,
              height: 24,
              child: Center(
                child: Container(
                  width: isCurrent ? 16 : 12,
                  height: isCurrent ? 16 : 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color:
                        isUpcoming
                            ? Colors.transparent
                            : isCurrent
                            ? StitchTheme.adwaGold
                            : StitchTheme.muted,
                    border:
                        isUpcoming
                            ? Border.all(
                              color: StitchTheme.muted,
                              width: 1.5,
                            )
                            : isCurrent
                            ? Border.all(
                              color: StitchTheme.adwaGold.withValues(
                                alpha: 0.28,
                              ),
                              width: 4,
                              strokeAlign: BorderSide.strokeAlignOutside,
                            )
                            : null,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 7),
            Text(
              '${room.storyOrder}',
              maxLines: 1,
              style: StitchTheme.body(
                size: 12,
                weight: isCurrent ? FontWeight.w700 : FontWeight.w600,
                color:
                    isCurrent ? StitchTheme.parchment : StitchTheme.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VisitedNode extends StatelessWidget {
  const _VisitedNode({required this.room, required this.isCurrent});

  final Room room;
  final bool isCurrent;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 54,
      child: Column(
        children: <Widget>[
          SizedBox(
            width: 24,
            height: 24,
            child: Center(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: isCurrent ? 16 : 12,
                height: isCurrent ? 16 : 12,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color:
                      isCurrent ? StitchTheme.adwaGold : StitchTheme.muted,
                  border:
                      isCurrent
                          ? Border.all(
                            color: StitchTheme.adwaGold.withValues(alpha: 0.28),
                            width: 4,
                            strokeAlign: BorderSide.strokeAlignOutside,
                          )
                          : null,
                ),
              ),
            ),
          ),
          const SizedBox(height: 7),
          Text(
            '${room.storyOrder}',
            maxLines: 1,
            style: StitchTheme.body(
              size: 12,
              weight: isCurrent ? FontWeight.w700 : FontWeight.w600,
              color:
                  isCurrent ? StitchTheme.parchment : StitchTheme.muted,
            ),
          ),
        ],
      ),
    );
  }
}

class _Connector extends StatelessWidget {
  const _Connector({required this.highlighted});

  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 2,
      margin: const EdgeInsets.only(top: 11),
      color:
          (highlighted ? StitchTheme.muted : StitchTheme.obsidian)
              .withValues(alpha: highlighted ? 0.55 : 1),
    );
  }
}

class _UpcomingNode extends StatelessWidget {
  const _UpcomingNode({required this.label, this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Column(
            children: <Widget>[
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: StitchTheme.adwaGold,
                    width: 2,
                  ),
                ),
              ),
              const SizedBox(height: 7),
              Text(
                label,
                style: StitchTheme.body(
                  size: 12,
                  weight: FontWeight.w600,
                  color: StitchTheme.adwaGold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CompleteNode extends StatelessWidget {
  const _CompleteNode({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 2),
      child: Column(
        children: <Widget>[
          const SizedBox(
            width: 24,
            height: 24,
            child: Icon(
              Icons.check_circle_outline,
              size: 22,
              color: StitchTheme.adwaGold,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            label,
            style: StitchTheme.body(
              size: 12,
              weight: FontWeight.w600,
              color: StitchTheme.adwaGold,
            ),
          ),
        ],
      ),
    );
  }
}
