import enum
import math
import random
import time


BUBBLE_COLORS = ['yellow', 'red', 'green', 'magenta', 'blue', 'orange']
BUBBLE_RADIUS = 10

# bubbles can "slide" between other bubbles in handy ways with this
_EASY_SLIDE_FACTOR = 0.7

# how many times does one need to shoot to get a row of new bubbles?
# TODO: better name for this constant
_NEW_ROW_FREQUENCY = 5

# size, as number of bubbles
_X_BUBBLE_COUNT_LIMIT = 20
_Y_BUBBLE_COUNT_LIMIT = 15


class GameStatus(enum.Enum):
    PLAYING = 1
    GAME_OVER = 2
    WIN = 3


class AttachResult(enum.Enum):
    NOT_ATTACHED = 0
    ATTACHED = 1
    ATTACHED_AND_BUBBLES_DESTROYED = 2


class Bubble:

    def __init__(self, coords, color, move_callback):
        self._coords = coords
        self.color = color
        self._move_callback = move_callback

    @property
    def coords(self):
        return self._coords

    @coords.setter
    def coords(self, coords):
        self._coords = coords
        self._move_callback(self)


def tuple_hypot(tuple1, tuple2):
    x1, y1 = tuple1
    x2, y2 = tuple2
    return math.hypot(x2 - x1, y2 - y1)


class Game:

    # "bubble counts" of non-moving bubbles are how many bubbles could be
    # between them and the top and left walls
    def __init__(self, shooter_bubble_y_relative, bubble_create_callback,
                 bubble_move_callback, bubble_destroy_callback,
                 status_changed_callback, timeout_callback):
        self.status = GameStatus.PLAYING   # remember status_changed_callback
        self._shooter_bubble_y = self.get_height() + shooter_bubble_y_relative
        self._attached_bubbles = {}     # {(x_count, y_count): bubble}

        # called with 1 arg, the Bubble
        self._bubble_create_callback = bubble_create_callback
        self._bubble_move_callback = bubble_move_callback
        self._bubble_destroy_callback = bubble_destroy_callback

        # takes 1 argument, and calls it over and over again until it returns
        # False
        self._timeout_callback = timeout_callback

        # takes 1 argument, the new status
        self.status_changed_callback = status_changed_callback

        self.shot_bubble_moving = False
        self._shoot_counter = 0

    # MUST be called after creating a new Game
    # unlike __init__, this may call _bubble_blah_callback()
    def create_initial_bubbles(self):
        for i in range(_Y_BUBBLE_COUNT_LIMIT // 2):
            self.add_bubble_row_or_rows(colors=BUBBLE_COLORS)
        self._create_next_shot_bubble()

    def _create_next_shot_bubble(self):
        self._next_shoot_bubble = Bubble(
            (self.get_width() / 2, self._shooter_bubble_y),
            random.choice(list(self._get_used_colors())),
            self._bubble_move_callback)
        self._bubble_create_callback(self._next_shoot_bubble)

    def _check_game_over_or_win(self):
        assert self.status == GameStatus.PLAYING

        if not self._attached_bubbles:
            self.status = GameStatus.WIN
            self.status_changed_callback(self.status)
            return

        for x_count, y_count in self._attached_bubbles:
            assert 0 <= x_count < _X_BUBBLE_COUNT_LIMIT
            assert 0 <= y_count
            if y_count >= _Y_BUBBLE_COUNT_LIMIT:
                self.status = GameStatus.GAME_OVER
                self.status_changed_callback(self.status)
                return

    # removes bubbles that don't touch other bubbles or the ceiling
    # may change self.status
    def _remove_loose_bubbles(self):
        not_loose = set()

        def recurser(recurser_counts):
            if recurser_counts in (self._attached_bubbles.keys() - not_loose):
                not_loose.add(recurser_counts)
                for neighbor in self._get_neighbors(recurser_counts):
                    recurser(neighbor)

        for x in range(_X_BUBBLE_COUNT_LIMIT):
            recurser((x, 0))

        did_something = False
        for counts in self._attached_bubbles.keys() - not_loose:
            self._bubble_destroy_callback(self._attached_bubbles.pop(counts))
            did_something = True
        if did_something:
            # removing the loose bubbles might have created more loose bubbles
            # to be removed
            self._remove_loose_bubbles()
        else:
            # this runs once only
            self._check_game_over_or_win()

    def _get_used_colors(self):
        return {bubble.color for bubble in self._attached_bubbles.values()}

    # may change self.status
    def add_bubble_row_or_rows(self, *, colors=None):
        assert self.status == GameStatus.PLAYING
        if colors is None:
            colors = list(self._get_used_colors())

        # in the beginning of the game, add 1 row at a time
        # when all bubbles of some color are gone, add 2 rows at a time
        # etc
        how_many_rows = len(BUBBLE_COLORS) - len(colors) + 1

        for junk in range(how_many_rows):
            self._attached_bubbles = {
                (x_count, y_count + 1): bubble
                for (x_count, y_count), bubble in self._attached_bubbles.items()}
            for counts, bubble in self._attached_bubbles.items():
                bubble.coords = self._get_coords(counts)
                self._bubble_move_callback(bubble)

            for x_count in range(_X_BUBBLE_COUNT_LIMIT):
                coords = self._get_coords((x_count, 0))
                bubble = Bubble(coords, random.choice(colors),
                                self._bubble_move_callback)
                self._bubble_create_callback(bubble)
                self._attached_bubbles[(x_count, 0)] = bubble

        self._remove_loose_bubbles()

    def get_width(self):
        return (2*_X_BUBBLE_COUNT_LIMIT + 1) * BUBBLE_RADIUS

    def get_height(self):
        radius_count = 1 + math.sqrt(3)*(_Y_BUBBLE_COUNT_LIMIT - 1) + 1
        return radius_count * BUBBLE_RADIUS

    def _get_coords(self, counts):
        x_count, y_count = counts
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
        looking4color = self._attached_bubbles[counts].color
        result = []

        def recurser(recurser_counts):
            result.append(recurser_counts)
            for neighbor in self._get_neighbors(recurser_counts):
                try:
                    color = self._attached_bubbles[neighbor].color
                except KeyError:
                    continue
                if color == looking4color and neighbor not in result:
                    recurser(neighbor)

        recurser(counts)
        return result

    # returns False if the moving bubble doesn't need to stop yet
    # may change self.status
    def _attach_bubble(self, bubble):
        # do nothing if it doesn't hit the ceiling or any of the other bubbles
        if bubble.coords[1] > BUBBLE_RADIUS:
            for other in self._attached_bubbles.values():
                distance = tuple_hypot(bubble.coords, other.coords)
                if distance <= 2*BUBBLE_RADIUS*_EASY_SLIDE_FACTOR:
                    break
            else:
                return False

        # what's the best place to put this bubble to?
        places = []     # contains ((x_count, y_count), distance) tuples
        for x_count in range(_X_BUBBLE_COUNT_LIMIT):
            # +1 to make it possible to get game over this way
            for y_count in range(_Y_BUBBLE_COUNT_LIMIT + 1):
                counts = (x_count, y_count)
                if counts not in self._attached_bubbles:
                    coords = self._get_coords(counts)
                    distance = tuple_hypot(bubble.coords, coords)
                    places.append((counts, distance))

        counts, junk = min(places, key=(lambda place: place[-1]))
        self._attached_bubbles[counts] = bubble
        bubble.coords = self._get_coords(counts)

        same_color = self._get_same_color_neighbors(counts)
        if len(same_color) >= 3:
            for counts in same_color:
                other_bubble = self._attached_bubbles.pop(counts)
                self._bubble_destroy_callback(other_bubble)
        else:
            # no other bubbles were destroyed in the attaching process, so add
            # some new rows if needed
            self._shoot_counter += 1
            if self._shoot_counter % _NEW_ROW_FREQUENCY == 0:
                self.add_bubble_row_or_rows()   # may change self.status

        if self.status == GameStatus.PLAYING:
            self._remove_loose_bubbles()
        return True

    def shoot(self, angle):
        bubble = self._next_shoot_bubble
        self._create_next_shot_bubble()
        self.shot_bubble_moving = True

        speed = 300
        velocity_x = speed*math.cos(angle)
        velocity_y = speed*math.sin(angle)
        previous_time = time.time()

        def callback():
            nonlocal previous_time
            nonlocal velocity_x
            nonlocal velocity_y

            new_time = time.time()
            time_passed = new_time - previous_time
            previous_time = new_time

            x, y = bubble.coords
            x += velocity_x * time_passed
            y += velocity_y * time_passed

            if x < BUBBLE_RADIUS:
                x = BUBBLE_RADIUS
                velocity_x = abs(velocity_x)
            if x > self.get_width() - BUBBLE_RADIUS:
                x = self.get_width() - BUBBLE_RADIUS
                velocity_x = -abs(velocity_x)
            bubble.coords = (x, y)

            # attach_bubble() returns whether the bubble was attached
            # this should return whether this should be called again soon
            if self._attach_bubble(bubble):
                self.shot_bubble_moving = False
                return False

            return True

        self._timeout_callback(callback)
