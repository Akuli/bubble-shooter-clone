import enum
import math
import random

import teek


class GameOverError(Exception):
    pass


BUBBLE_COLORS = ['yellow', 'red', 'green', 'magenta', 'blue', 'orange']

# bubbles are displayed with a slightly smaller radius than calculated because
# that leaves small gaps between the bubbles, looks nicer
BUBBLE_RADIUS = 10
BUBBLE_DISPLAY_RADIUS = 8

# bubbles can "slide" between other bubbles in handy ways with this
EASY_SLIDE_FACTOR = 0.7

# how many times does one need to shoot to get a row of new balls?
# TODO: better name for this constant
NEW_ROW_FREQUENCY = 5


def draw_bubble(canvas, x, y, color):
    result = canvas.create_oval(0, 0, 0, 0, fill=color)
    move_bubble(result, x, y)
    return result


def move_bubble(item, x, y):
    item.coords = (x - BUBBLE_DISPLAY_RADIUS, y - BUBBLE_DISPLAY_RADIUS,
                   x + BUBBLE_DISPLAY_RADIUS, y + BUBBLE_DISPLAY_RADIUS)


class AttachResult(enum.Enum):
    NOT_ATTACHED = 0
    ATTACHED = 1
    ATTACHED_AND_BUBBLES_DESTROYED = 2


class BubbleManager:

    # "bubble counts" of non-moving bubbles are how many bubbles could be
    # between them and the top and left walls
    def __init__(self, x_bubble_count_limit, y_bubble_count_limit):
        self._x_bubble_count_limit = x_bubble_count_limit
        self._y_bubble_count_limit = y_bubble_count_limit
        self._attached_bubbles = {}     # {(x_count, y_count): color}

        for i in range(y_bubble_count_limit // 2):
            self.add_bubble_row(colors=BUBBLE_COLORS)

    # removes bubbles that don't touch other bubbles or the ceiling
    def _remove_loose_bubbles(self):
        not_loose = set()

        def recurser(recurser_counts):
            if recurser_counts in (self._attached_bubbles.keys() - not_loose):
                not_loose.add(recurser_counts)
                for neighbor in self._get_neighbors(recurser_counts):
                    recurser(neighbor)

        for x in range(self._x_bubble_count_limit):
            recurser((x, 0))

        did_something = False
        for counts in self._attached_bubbles.keys() - not_loose:
            del self._attached_bubbles[counts]
            did_something = True
        if did_something:
            # removing the loose bubbles might have created more loose bubbles
            # to be removed
            self._remove_loose_bubbles()

    # raises GameOverError
    def _check_game_over(self):
        for x_count, y_count in self._attached_bubbles:
            assert 0 <= x_count < self._x_bubble_count_limit
            assert 0 <= y_count
            if y_count >= self._y_bubble_count_limit:
                print('GAME OVER')
                raise GameOverError

    def get_used_colors(self):
        return set(self._attached_bubbles.values())

    # raises GameOverError
    # TODO: don't always add all colors
    def add_bubble_row(self, *, colors=None):
        if colors is None:
            colors = list(self.get_used_colors())

        # in the beginning of the game, add 1 row at a time
        # when all bubbles of some color are gone, add 2 rows at a time
        # etc
        if colors:
            how_many_rows = len(BUBBLE_COLORS) - len(colors) + 1
        else:
            # TODO: win message
            how_many_rows = 0

        for junk in range(how_many_rows):
            self._attached_bubbles = {
                (x_count, y_count + 1): color
                for (x_count, y_count), color in self._attached_bubbles.items()}
            for x in range(self._x_bubble_count_limit):
                self._attached_bubbles[(x, 0)] = random.choice(colors)

        self._remove_loose_bubbles()
        self._check_game_over()

    def get_width(self):
        return (2*self._x_bubble_count_limit + 1) * BUBBLE_RADIUS

    def get_height(self):
        radiuses = 1 + math.sqrt(3)*(self._y_bubble_count_limit - 1) + 1
        return radiuses * BUBBLE_RADIUS

    def get_coords(self, bubble):
        x_count, y_count = bubble
        return ((1 + (y_count % 2) + 2*x_count) * BUBBLE_RADIUS,
                (1 + y_count*math.sqrt(3)) * BUBBLE_RADIUS)

    def _get_neighbors(self, counts):
        x_count, y_count = counts
        # this returns the neighbors A,B,C,D,E,F of X
        #
        #  A B
        # C X D
        #  E F
        result = {
            (x_count - 1, y_count),     # C
            (x_count + 1, y_count),     # D
        }
        for y in [y_count - 1, y_count + 1]:
            result.add((x_count - 1 + (y_count % 2), y))    # A or E
            result.add((x_count + (y_count % 2), y))        # B or F
        return result

    def _get_same_color_neighbors(self, counts):
        looking4color = self._attached_bubbles[counts]
        result = []

        def recurser(recurser_counts):
            result.append(recurser_counts)
            for neighbor in self._get_neighbors(recurser_counts):
                if (self._attached_bubbles.get(neighbor, None) == looking4color
                        and neighbor not in result):
                    recurser(neighbor)

        recurser(counts)
        return result

    # returns False if the moving bubble doesn't need to stop yet
    # raises GameOverError
    def attach_bubble(self, x, y, color):
        # do nothing if it doesn't hit the ceiling or any of the other bubbles
        if y > BUBBLE_RADIUS:
            for attached in self._attached_bubbles:
                other_x, other_y = self.get_coords(attached)
                distance = math.hypot(x - other_x, y - other_y)
                if distance <= 2*BUBBLE_RADIUS*EASY_SLIDE_FACTOR:
                    break
            else:
                return AttachResult.NOT_ATTACHED

        # what's the best place to put this bubble to?
        existing_counts = {bubble[:2] for bubble in self._attached_bubbles}
        places = []     # contains (x_count, y_count, distance) tuples
        for x_count in range(self._x_bubble_count_limit):
            # +1 to make it possible to get game over this way
            for y_count in range(self._y_bubble_count_limit + 1):
                counts = (x_count, y_count)
                if counts not in existing_counts:
                    possible_x, possible_y = self.get_coords(counts)
                    distance = math.hypot(x - possible_x, y - possible_y)
                    places.append((counts, distance))

        counts, junk = min(places, key=(lambda place: place[-1]))
        self._attached_bubbles[counts] = color

        same_color = self._get_same_color_neighbors(counts)
        if len(same_color) >= 3:
            for same_color_counts in same_color:
                del self._attached_bubbles[same_color_counts]
            result = AttachResult.ATTACHED_AND_BUBBLES_DESTROYED
        else:
            result = AttachResult.ATTACHED

        self._remove_loose_bubbles()
        self._check_game_over()
        return result

    def draw_attached_bubbles(self, canvas):
        for item in canvas.find_withtag('attached_bubble'):
            item.delete()

        for counts, color in self._attached_bubbles.items():
            centerx, centery = self.get_coords(counts)
            item = draw_bubble(canvas, centerx, centery, color)
            item.tags.add('attached_bubble')


class ShotBubble:

    def __init__(self, x, y, angle, canvas_width, color):
        initial_speed = 0.3
        self._velocity_x = initial_speed*math.cos(angle)
        self._velocity_y = initial_speed*math.sin(angle)
        self.x = x
        self.y = y
        self.color = color
        self._canvas_width = canvas_width
        self._canvas_item = None

    def draw(self, canvas):
        self._canvas_item = draw_bubble(canvas, 0, 0, self.color)
        self._canvas_item.tags.add('shot_bubble')
        self._update_item_coords()

    def move(self, time_diff):
        self.x += self._velocity_x * time_diff
        self.y += self._velocity_y * time_diff

        if self.x < BUBBLE_RADIUS:
            self.x = BUBBLE_RADIUS
            self._velocity_x = abs(self._velocity_x)
        if self.x > self._canvas_width - BUBBLE_RADIUS:
            self.x = self._canvas_width - BUBBLE_RADIUS
            self._velocity_x = -abs(self._velocity_x)

        self._update_item_coords()

    def _update_item_coords(self):
        move_bubble(self._canvas_item, self.x, self.y)


class Shooter:

    def __init__(self, height, canvas_width, y_offset):
        self._angle = -2*math.pi/4      # up
        self._center_x = canvas_width / 2
        self._center_y = y_offset + height/2
        self._canvas_width = canvas_width
        self._radius = height/2
        self._line = None
        self._next_bubble_item = None
        self._next_bubble_color = random.choice(BUBBLE_COLORS)
        self._shoot_counter = 0

    def draw(self, canvas):
        canvas.create_oval(
            self._center_x - self._radius,
            self._center_y - self._radius,
            self._center_x + self._radius,
            self._center_y + self._radius,
        )
        self._line = canvas.create_line(
            self._center_x, self._center_y, 0, 0)
        self._next_bubble_item = canvas.create_oval(
            self._center_x - BUBBLE_RADIUS, self._center_y - BUBBLE_RADIUS,
            self._center_x + BUBBLE_RADIUS, self._center_y + BUBBLE_RADIUS,
            fill=self._next_bubble_color)

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

        end_x = self._center_x + self._radius*math.cos(angle)
        end_y = self._center_y + self._radius*math.sin(angle)
        self._line.coords = (self._center_x, self._center_y, end_x, end_y)
        move_bubble(self._next_bubble_item, self._center_x, self._center_y)

    def aim_to(self, x, y):
        x_diff = x - self._center_x
        y_diff = y - self._center_y
        self._set_angle(math.atan2(y_diff, x_diff))

    def shoot(self, next_color_choices):
        result = ShotBubble(self._center_x, self._center_y, self._angle,
                            self._canvas_width, self._next_bubble_color)
        if next_color_choices:
            self._next_bubble_color = random.choice(list(next_color_choices))
        self._next_bubble_item.config['fill'] = self._next_bubble_color
        return result

    def increment_counter(self):
        print('incrementing counter')
        self._shoot_counter += 1
        return (self._shoot_counter % NEW_ROW_FREQUENCY == 0)


class BubbleShooterUI(teek.Frame):

    def __init__(self, parent):
        super().__init__(parent)

        self._manager = BubbleManager(20, 15)
        shooter_size = 70
        self._canvas = teek.Canvas(
            self, width=self._manager.get_width(),
            height=(self._manager.get_height() + shooter_size), bg='white')
        self._canvas.pack()
        self._canvas.bind('<Motion>', self._on_mouse_move, event=True)
        self._canvas.bind('<Button-1>', self._shoot)

        self._shooter = Shooter(
           shooter_size, self._manager.get_width(), self._manager.get_height())
        self._shot_bubble = None

        self._manager.draw_attached_bubbles(self._canvas)
        self._shooter.draw(self._canvas)

    def _on_mouse_move(self, event):
        self._shooter.aim_to(event.x, event.y)

    def _shoot(self):
        if self._shot_bubble is not None:
            # need to wait for previous bubble to finish getting shot
            return

        self._shot_bubble = self._shooter.shoot(
            self._manager.get_used_colors())
        self._shot_bubble.draw(self._canvas)
        self._move_shot_bubble()

    def _move_shot_bubble(self):
        self._shot_bubble.move(20)
        attach_result = self._manager.attach_bubble(
            self._shot_bubble.x, self._shot_bubble.y,
            self._shot_bubble.color)
        if attach_result == AttachResult.NOT_ATTACHED:
            teek.after(20, self._move_shot_bubble)
        else:
            if attach_result == AttachResult.ATTACHED:
                should_add_row = self._shooter.increment_counter()
            elif attach_result == AttachResult.ATTACHED_AND_BUBBLES_DESTROYED:
                should_add_row = False
            else:
                raise RuntimeError("oh no")

            if should_add_row:
                self._manager.add_bubble_row()

            for item in self._canvas.find_withtag('shot_bubble'):
                item.delete()
            self._shot_bubble = None
            self._manager.draw_attached_bubbles(self._canvas)


def main():
    window = teek.Window()
    window.on_delete_window.connect(teek.quit)

    gui = BubbleShooterUI(window)
    gui.pack(fill='both', expand=True)
    teek.run()


if __name__ == '__main__':
    main()
