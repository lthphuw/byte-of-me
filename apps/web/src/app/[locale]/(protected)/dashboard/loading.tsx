import Loading from '@/shared/ui/loading';

export default function HomeLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center pl-[256px]">
      <Loading size={45} />
    </div>
  );
}
