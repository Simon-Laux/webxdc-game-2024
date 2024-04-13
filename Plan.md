The idea is to make somewhat modular state systems that can be copied for other projects.


systems (ideas):

- [X] Ping
- [ ] 2 Player Matchmaking, with the ability to spectate running games
- [ ] Make a 2 player game with rollback + input delay that is based on ping * 1.5


Other tasks & ideas:
- [ ] DebugUI: human readable last seen (relative time? but we would need to update that very often, so maybe better only time + milis?)
- [ ] DebugUI: ping graph: when peers join recalculate layout/positions 
- [X] DebugUI: the edge arrows are confusing, use colors instead
- [ ] Ping system: think about disconnection detection
    - maybe let the peers report also the last seen time in `ping.report`
    - maybe add a timeut to ping requests
- [ ] DebugUI & ping system: remember ping history (last n pings)