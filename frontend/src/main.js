import Aura from '@primevue/themes/aura';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import DialogService from 'primevue/dialogservice';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';
import { createApp } from 'vue';
import DataTableLabels from './plugins/datatableLabels';

import 'primeflex/primeflex.css';
import 'primeicons/primeicons.css';
import './assets/responsive.css';

import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark-mode',
    },
  },
  ripple: true,
});
app.use(ToastService);
app.use(ConfirmationService);
app.use(DialogService);
app.directive('tooltip', Tooltip);
app.use(DataTableLabels);

app.mount('#app');
