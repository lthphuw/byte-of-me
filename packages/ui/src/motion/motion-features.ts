// Lazily-loaded feature bundle for <LazyMotion>, in its own module so the
// provider can import it dynamically and keep it out of the initial JS.
// `domAnimation`, not `domMax`: no `m.*` uses `layout`/`drag`, and popLayout
// only measures the DOM (PopChild, no projection). Dashboard `Reorder` is
// `motion.*` and brings its own drag/layout features.
import { domAnimation } from 'framer-motion';

export default domAnimation;
