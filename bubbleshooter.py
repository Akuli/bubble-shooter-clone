import math
import random

import teek


class GameOverError(Exception):
    pass


BUBBLE_RADIUS = 10
BUBBLE_COLORS = ['yellow', 'red', 'green', 'magenta', 'blue']


class BubbleManager:

    # "bubble counts" of non-moving bubbles are how many bubbles could be
    # between them and the top and left walls
    def __init__(self, x_bubble_count_limit, y_bubble_count_limit):
        self.x_bubble_count_limit = x_bubble_count_limit
        self.y_bubble_count_limit = y_bubble_count_limit
        self.attached_bubbles = set()     # 3-tuples: (x_count, y_count, color)

        for i in range(y_bubble_count_limit // 2):
            self._add_bubble_row()

    # removes bubbles that don't touch other bubbles or the ceiling
    def _remove_loose_bubbles(self):
        not_loose = set()
        attached_counts = {xyc[:2] for xyc in self.attached_bubbles}

        def recurser(recurser_x, recurser_y):
            if (recurser_x, recurser_y) in attached_counts and (recurser_x, recurser_y) not in not_loose:
                not_loose.add((recurser_x, recurser_y))
                for x, y in self._get_neighbors(recurser_x, recurser_y):
                    recurser(x, y)

        for x in range(self.x_bubble_count_limit):
            recurser(x, 0)

        did_something = False
        for x, y in attached_counts - not_loose:
            color = {(x, y): c for x, y, c in self.attached_bubbles}[(x, y)]
            self.attached_bubbles.remove((x, y, color))
            did_something = True
        if did_something:
            # removing the loose bubbles might have created more loose bubbles
            # to be removed
            self._remove_loose_bubbles()

    # raises GameOverError
    def _check_game_over(self):
        for x_count, y_count, color in self.attached_bubbles:
            assert 0 <= x_count < self.x_bubble_count_limit
            assert 0 <= y_count
            if y_count >= self.y_bubble_count_limit:
                raise GameOverError

    # raises GameOverError
    def _add_bubble_row(self):
        self.attached_bubbles = {
            (x_count, y_count + 1, color)
            for x_count, y_count, color in self.attached_bubbles}
        for x in range(self.x_bubble_count_limit):
            self.attached_bubbles.add((x, 0, random.choice(BUBBLE_COLORS)))

        self._remove_loose_bubbles()
        self._check_game_over()

    def get_width(self):
        return (2*self.x_bubble_count_limit + 1) * BUBBLE_RADIUS

    def get_height(self):
        radiuses = 1 + math.sqrt(3)*(self.y_bubble_count_limit - 1) + 1
        return radiuses * BUBBLE_RADIUS

    def get_coords(self, bubble):
        x_count, y_count = bubble[:2]   # ignore color, if any
        return ((1 + (y_count % 2) + 2*x_count) * BUBBLE_RADIUS,
                (1 + y_count*math.sqrt(3)) * BUBBLE_RADIUS)

    def _get_neighbors(self, x_count, y_count):
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
        return {(x, y) for x, y in result
                if x in range(self.x_bubble_count_limit)
                and y in range(self.y_bubble_count_limit)}

    def _get_same_color_neighbors(self, x_count, y_count):
        color_dict = {(x, y): color for x, y, color in self.attached_bubbles}
        looking4color = color_dict[x_count, y_count]
        result = [(x_count, y_count, looking4color)]

        def recurser(recurser_x, recurser_y):
            for x, y in self._get_neighbors(recurser_x, recurser_y):
                if (color_dict.get((x, y), None) == looking4color and
                        (x, y, color_dict[(x, y)]) not in result):
                    result.append((x, y, color_dict[(x, y)]))
                    recurser(x, y)

        recurser(x_count, y_count)
        return result

    # returns False if the moving bubble doesn't need to stop yet
    # raises GameOverError
    def attach_bubble(self, x, y, color):
        # do nothing if it doesn't hit the ceiling or any of the other bubbles
        if y > BUBBLE_RADIUS:
            for attached in self.attached_bubbles:
                other_x, other_y = self.get_coords(attached)
                distance = math.hypot(x - other_x, y - other_y)
                # TODO: this seems to be a bit too strict
                if distance <= 2*BUBBLE_RADIUS:
                    break
            else:
                return False

        # what's the best place to put this bubble to?
        existing_counts = {bubble[:2] for bubble in self.attached_bubbles}
        places = []     # contains (x_count, y_count, distance) tuples
        for x_count in range(self.x_bubble_count_limit):
            # +1 to make it possible to get game over this way
            for y_count in range(self.y_bubble_count_limit + 1):
                counts = (x_count, y_count)
                if counts not in existing_counts:
                    possible_x, possible_y = self.get_coords(counts)
                    distance = math.hypot(x - possible_x, y - possible_y)
                    places.append((x_count, y_count, distance))

        x_count, y_count, junk = min(places, key=(lambda place: place[-1]))
        self.attached_bubbles.add((x_count, y_count, color))

        same_color = self._get_same_color_neighbors(x_count, y_count)
        if len(same_color) >= 3:
            for bubble in same_color:
                self.attached_bubbles.remove(bubble)

        self._remove_loose_bubbles()
        self._check_game_over()
        return True

    def draw_attached_bubbles(self, canvas):
        for item in canvas.find_withtag('attached_bubble'):
            item.delete()

        for bubble in self.attached_bubbles:
            color = bubble[2]
            centerx, centery = self.get_coords(bubble)
            canvas.create_oval(
                centerx - BUBBLE_RADIUS,
                centery - BUBBLE_RADIUS,
                centerx + BUBBLE_RADIUS,
                centery + BUBBLE_RADIUS,
                fill=color,
            ).tags.add('attached_bubble')


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
        self._canvas_item = canvas.create_oval(0, 0, 0, 0, fill=self.color)
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
        self._canvas_item.coords = (
            self.x - BUBBLE_RADIUS, self.y - BUBBLE_RADIUS,
            self.x + BUBBLE_RADIUS, self.y + BUBBLE_RADIUS)


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

    def draw(self, canvas):
        canvas.create_oval(
            self._center_x - self._radius,
            self._center_y - self._radius,
            self._center_x + self._radius,
            self._center_y + self._radius,
        ).tags.add('shooter')
        self._line = canvas.create_line(
            self._center_x, self._center_y, 0, 0)
        self._line.tags.add('shooter')
        self._next_bubble_item = canvas.create_oval(
            self._center_x - BUBBLE_RADIUS, self._center_y - BUBBLE_RADIUS,
            self._center_x + BUBBLE_RADIUS, self._center_y + BUBBLE_RADIUS,
            fill=self._next_bubble_color)
        self._next_bubble_item.tags.add('shooter')

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
        self._next_bubble_item.coords = (
            self._center_x - BUBBLE_RADIUS, self._center_y - BUBBLE_RADIUS,
            self._center_x + BUBBLE_RADIUS, self._center_y + BUBBLE_RADIUS)

    def aim_to(self, x, y):
        x_diff = x - self._center_x
        y_diff = y - self._center_y
        self._set_angle(math.atan2(y_diff, x_diff))

    def shoot(self):
        result = ShotBubble(self._center_x, self._center_y, self._angle,
                            self._canvas_width, self._next_bubble_color)
        self._next_bubble_color = random.choice(BUBBLE_COLORS)
        self._next_bubble_item.config['fill'] = self._next_bubble_color
        return result


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

        self._shot_bubble = self._shooter.shoot()
        self._shot_bubble.draw(self._canvas)
        self._move_shot_bubble()

    def _move_shot_bubble(self):
        self._shot_bubble.move(20)
        if self._manager.attach_bubble(
                self._shot_bubble.x, self._shot_bubble.y,
                self._shot_bubble.color):
            for item in self._canvas.find_withtag('shot_bubble'):
                item.delete()
            self._shot_bubble = None
            self._manager.draw_attached_bubbles(self._canvas)
        else:
            teek.after(20, self._move_shot_bubble)


def main():
    window = teek.Window()
    window.on_delete_window.connect(teek.quit)

    gui = BubbleShooterUI(window)
    gui.pack(fill='both', expand=True)
    teek.run()


if __name__ == '__main__':
    main()
