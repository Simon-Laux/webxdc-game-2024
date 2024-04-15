The idea is to make somewhat modular state systems that can be copied for other projects.

important TODO:
- [ ] Option to cancel mtch invitation
- [ ] There is some bug when ending the game that it sometimes can be ended even though it is already over?

systems (ideas):

- [X] Ping
- [ ] 2 Player Matchmaking, with the ability to spectate running games
- [ ] Make a 2 player game with rollback + input delay that is based on ping * 1.5
- [ ] Toast system that shows errors to the user


Other tasks & ideas:
- [ ] DebugUI: human readable last seen (relative time? but we would need to update that very often, so maybe better only time + milis?)
- [X] DebugUI: ping graph: when peers join recalculate layout/positions 
- [X] DebugUI: the edge arrows are confusing, use colors instead
- [ ] Ping system: think about disconnection detection
    - [X] maybe let the peers report also the last seen time in `ping.report`
    - maybe add a timeout to ping requests
- [ ] DebugUI & ping system: remember ping history (last n pings)

- [ ] Ability to spectate -> host sends checkpoint (complete gamestate) every 3 seconds to sync with guest and to make it possible to spectate, spectator just needs to wait up to 3 seconds to get the chekpoint and then they can spectate the game

Out of scope:
- [ ] record and replay matches (send via use update)