Component({
  properties: {
    item: {
      type: Object,
      value: {},
    },
    checked: {
      type: Boolean,
      value: false,
    },
  },

  methods: {
    onToggle() {
      this.triggerEvent('toggle', { id: this.data.item.id });
    },

    onMinus() {
      const { item } = this.data;
      if (item.quantity <= 1) return;
      this.triggerEvent('minus', { id: item.id, quantity: item.quantity - 1 });
    },

    onPlus() {
      const { item } = this.data;
      this.triggerEvent('plus', { id: item.id, quantity: item.quantity + 1 });
    },
  },
});
