import teek

from . import gui


def main():
    window = teek.Window()
    window.on_delete_window.connect(teek.quit)

    widget = gui.BubbleShooterWidget(window)
    widget.pack(fill='both', expand=True)
    teek.run()


if __name__ == '__main__':
    main()
