import Vue from 'vue';
import Router from 'vue-router';
import Home from '@/components/Home';
import CRDT from '@/components/CRDT';

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'Home',
            component: Home
        }, {
            path: '/crdt',
            name: 'CRDT',
            component: CRDT
        }
    ]
});
