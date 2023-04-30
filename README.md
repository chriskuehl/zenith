Zenith
========

Zenith is a fun little platformer game created as an experiment during a
hackathon. You can play it from your web browser at [zenith.ckuehl.me][zenith].

![Game screenshot](https://i.fluffy.cc/XcFC7RNnR0lVkG4WTDzttTlnBktDLV6D.png)

Zenith tries to copy the basic movement mechanics of [Celeste][celeste], including:

* Basic player movement, gravity, etc.
* 8-directional dashing (dash restored on landing)
* Wall jumping (including [neutral jumping][neutral-jump])
* [Wavedashing][wavedash] and [hypers][hyper] (including dash restoration with
  properly-timed jumps for both)

Note that the movement constants are currently set for a much higher movement
speed than Celeste at the moment and need additional tuning.


## Instructions

You can play it at [zenith.ckuehl.me][zenith].


### Controls

It's recommended to plug in a Bluetooth or USB controller to play:

* Left joystick or dpad to move
* A to jump
* X or B to dash

You will need to press any button after connecting the controller for your
browser to make the controller visible to the webpage.

You can also play with a keyboard if you prefer:

* WASD or arrow keys to move
* Space or enter to jump
* Shift to dash

When dashing, keep in mind you can press movement keys to dash in any of the 8
cardinal/ordinal directions.

### Gameplay

There is currently no objective; all you can do is move around and try to avoid
dying.


## Known issues

* Browsers
  * Performance on Firefox is much worse than Chrome.
  * Gamepads may not work on Firefox.
  * Works on phones (including with connected controllers) but the UI does not
    scale well.
* Movement
  * Jumping is not very accurate to Celeste (cannot hold A for higher jumps,
    for example).
  * No velocity-based "sliding" around walls/corners.
  * Wall jumping logic should be improved to not rely on running horizontally
    into the wall so that parallel-wall-dash-jumps are possible.
  * No wall climbing.
  * No wall sliding.
  * No coyote time.


[zenith]: https://zenith.ckuehl.me/
[celeste]: https://en.wikipedia.org/wiki/Celeste_(video_game)
[hyper]: https://celestegame.fandom.com/wiki/Moves#Hyper_/_Reverse_Hyper
[wavedash]: https://celestegame.fandom.com/wiki/Moves#Wavedash_/_Reverse_Wavedash
[neutral-jump]: https://celestegame.fandom.com/wiki/Moves#Neutral_Jump
