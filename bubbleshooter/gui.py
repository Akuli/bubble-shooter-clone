import math

import teek

from . import core


# bubbles are displayed with a slightly smaller radius than calculated because
# that leaves small gaps between the bubbles, looks nicer
_BUBBLE_DISPLAY_RADIUS = 0.8*core.BUBBLE_RADIUS

_SHOOTER_RADIUS = 40


class _Shooter:

    def __init__(self, canvas_width, y_offset):
        self._angle = -2*math.pi/4      # up
        self._canvas_width = canvas_width
        self._center_x = canvas_width / 2
        self._center_y = y_offset + _SHOOTER_RADIUS
        self._line = None

    def draw(self, canvas):
        canvas.create_oval(
            self._center_x - _SHOOTER_RADIUS, self._center_y - _SHOOTER_RADIUS,
            self._center_x + _SHOOTER_RADIUS, self._center_y + _SHOOTER_RADIUS)
        self._line = canvas.create_line(self._center_x, self._center_y, 0, 0)

        self._set_angle(self._angle)

    def _set_angle(self, angle):
        # disallow shooting the bubble e.g. down or horizontally
        most_horizontal_allowed_sin = 0.05
        if math.sin(angle) > -most_horizontal_allowed_sin:
            if math.cos(angle) > 0:
                angle = -math.asin(most_horizontal_allowed_sin)
            else:
                angle = math.pi + math.asin(most_horizontal_allowed_sin)
        self._angle = angle

        end_x = self._center_x + _SHOOTER_RADIUS*math.cos(angle)
        end_y = self._center_y + _SHOOTER_RADIUS*math.sin(angle)
        self._line.coords = (self._center_x, self._center_y, end_x, end_y)

    def aim_to(self, x, y):
        x_diff = x - self._center_x
        y_diff = y - self._center_y
        self._set_angle(math.atan2(y_diff, x_diff))

    def get_angle(self):
        return self._angle


class BubbleShooterWidget(teek.Frame):

    def __init__(self, parent):
        super().__init__(parent)

        self._bubble_items = {}
        self._game = core.Game(
            _SHOOTER_RADIUS, self._on_bubble_created, self._on_bubble_move,
            self._on_bubble_destroyed, self._on_status_changed,
            self._timeout_callback)

        self._canvas = teek.Canvas(
            self, width=self._game.get_width(),
            height=(self._game.get_height() + 2*_SHOOTER_RADIUS),
            bg='white')
        self._canvas.pack()
        self._canvas.bind('<Motion>', self._on_mouse_move, event=True)
        self._canvas.bind('<Button-1>', self._shoot)

        self._shooter = _Shooter(self._game.get_width(),
                                self._game.get_height())
        self._shooter.draw(self._canvas)

        self._game.create_initial_bubbles()

        self._status_text = None

    def _on_bubble_created(self, bubble):
        item = self._canvas.create_oval(0, 0, 0, 0, fill=bubble.color)
        self._bubble_items[bubble] = item
        self._on_bubble_move(bubble)

    def _on_bubble_move(self, bubble):
        x, y = bubble.coords
        self._bubble_items[bubble].coords = (
            x - _BUBBLE_DISPLAY_RADIUS, y - _BUBBLE_DISPLAY_RADIUS,
            x + _BUBBLE_DISPLAY_RADIUS, y + _BUBBLE_DISPLAY_RADIUS)

    def _on_bubble_destroyed(self, bubble):
        self._bubble_items.pop(bubble).delete()

    def _timeout_callback(self, callback):
        def teeky_callback():
            if callback():
                teek.after(20, teeky_callback)

        teeky_callback()

    def _on_status_changed(self, status):
        if self._status_text is not None:
            self._status_text.delete()

        if status == core.GameStatus.GAME_OVER:
            text = "Game Over :("
        elif status == core.GameStatus.WIN:
            text = "You win :)"
        elif status == core.GameStatus.PLAYING:
            return
        else:   # pragma: no cover
            raise NotImplementedError(status)

        self._status_text = self._canvas.create_text(
            self._canvas.config['width']/2, self._canvas.config['height']/2,
            anchor='center', text=text, font=('', 30, 'bold'), fill='black')

    def _on_mouse_move(self, event):
        self._shooter.aim_to(event.x, event.y)

    def _shoot(self):
        if (self._game.status == core.GameStatus.PLAYING and
                not self._game.shot_bubble_moving):
            self._game.shoot(self._shooter.get_angle())
