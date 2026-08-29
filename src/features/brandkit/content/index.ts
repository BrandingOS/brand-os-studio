/**
 * The Brand Kit's content layer — what a deliverable contains, how it is
 * addressed, what it works out for itself, and how a renderer declares
 * which content its text is.
 *
 * This is the shared foundation Quick Edit is built on and the thing a
 * future Design surface would read: both edit the same object rather than
 * each owning a private copy of "what this artifact says".
 */
export * from './brandFacts';
export * from './kinds';
export * from './paths';
export * from './compute';
export * from './fields';
export * from './schema';
export { Bind, BindProvider, useBindContext, type BindFit, type BindContextValue } from './Bind';
export { ContentPanel } from './ContentPanel';
