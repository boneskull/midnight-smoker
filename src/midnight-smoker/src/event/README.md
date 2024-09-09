# `midnight-smoker/event`: Public Events

This contains definitions for all _public_ events emitted by the `midnight-smoker` package. "Emitted" means:

- Reporters may listen for these events via their `on<EventName>` methods. This is the main way public events are consumed
- Alternatively, an instance of a `Smoker` class emits these events
