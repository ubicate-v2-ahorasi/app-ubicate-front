import {
  trigger,
  transition,
  style,
  animate,
  state,
} from '@angular/animations';

export const fadeAnimation = trigger('fadeAnimation', [
  transition('* => *', [
    style({
      opacity: 0,
      transform: 'translateY(10px)'
    }),
    animate('350ms ease-out', style({
      opacity: 1,
      transform: 'translateY(0)'
    }))
  ])
]);

export const menuItemAnimation = trigger('menuItemAnimation', [
  state('inactive', style({
    backgroundColor: 'transparent'
  })),
  state('active', style({
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  })),
  transition('inactive => active', [
    animate('250ms cubic-bezier(0.4, 0, 0.2, 1)')
  ]),
  transition('active => inactive', [
    animate('200ms ease-out')
  ])
]);
